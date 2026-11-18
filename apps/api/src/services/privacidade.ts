/**
 * services/privacidade.ts — LGPD: direitos do titular e prazo de guarda
 *
 * O sistema guarda dados pessoais de clientes (nome, CPF, celular, município)
 * para o pós-venda de revisões. A LGPD dá ao cliente (o "titular") o direito
 * de saber o que é guardado sobre ele e de pedir que seja apagado, e pede que
 * os dados não fiquem guardados para sempre. Este serviço atende isso:
 *
 *  - buscarTitulares(): o Admin encontra o cliente por CPF ou nome;
 *  - dadosDoTitular(): tudo o que o sistema guarda sobre ele (para responder
 *    ao pedido de acesso), registrado na auditoria;
 *  - anonimizarCliente(): apaga os dados pessoais e tira as revisões da fila;
 *  - clientesForaDoPrazo(): quem passou do prazo de guarda (usado pelo script
 *    prisma/retencao.ts).
 *
 * Por que ANONIMIZAR e não excluir: as ligações já feitas entram no relatório
 * de produção das operadoras. Apagar as linhas mudaria relatórios de meses
 * passados. Na anonimização o cliente vira "CLIENTE ANONIMIZADO <id>", sem CPF,
 * celular nem observações das ligações; as contagens continuam certas.
 *
 * Regras e decisões pendentes: docs/lgpd.md.
 */

import { prisma } from "../db/prisma.js";
import { Prisma, SituacaoRevisao } from "../generated/prisma/client.js";
import { ErroHttp } from "../lib/erros.js";
import { documentoMascarado } from "../lib/formatar.js";
import type { UsuarioLogado } from "../middleware/auth.js";
import { ACOES, auditar } from "./auditoria.js";

/** Máximo de clientes devolvidos numa busca (o Admin refina se precisar). */
const MAX_BUSCA = 20;

/** Situações em que a revisão ainda está "viva" na fila de ligações. */
export const SITUACOES_ABERTAS: SituacaoRevisao[] = [
  SituacaoRevisao.PENDENTE,
  SituacaoRevisao.RETORNAR,
  SituacaoRevisao.AGENDADO,
  SituacaoRevisao.BUSCAR_CONTATO,
];

/**
 * Procura clientes pelo CPF/CNPJ (só números, exato) ou por parte do nome.
 * Na lista o documento vem mascarado; o completo só aparece em dadosDoTitular.
 */
export async function buscarTitulares(busca: string) {
  const digitos = busca.replace(/\D/g, "");
  const porDocumento = digitos.length === 11 || digitos.length === 14;
  const clientes = await prisma.cliente.findMany({
    where: porDocumento ? { cpfCnpj: digitos } : { nome: { contains: busca, mode: "insensitive" } },
    orderBy: { nome: "asc" },
    take: MAX_BUSCA,
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      municipio: true,
      anonimizadoEm: true,
      _count: { select: { veiculos: true } },
    },
  });
  return clientes.map(({ cpfCnpj, _count, ...c }) => ({
    ...c,
    documento: documentoMascarado(cpfCnpj),
    veiculos: _count.veiculos,
  }));
}

/**
 * Tudo o que o sistema guarda sobre um cliente: cadastro, motos, revisões e
 * ligações (com observações). Usado para responder ao pedido de acesso do
 * titular. A consulta fica na auditoria (sem os dados em si).
 *
 * @throws ErroHttp 404 cliente não encontrado
 */
export async function dadosDoTitular(id: number, usuario: UsuarioLogado) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      celular: true,
      municipio: true,
      anonimizadoEm: true,
      criadoEm: true,
      atualizadoEm: true,
      veiculos: {
        orderBy: { id: "asc" },
        select: {
          chassi: true,
          modelo: true,
          cor: true,
          dataVenda: true,
          revisoes: {
            orderBy: { km: "asc" },
            select: {
              id: true,
              km: true,
              situacao: true,
              dataAgendada: true,
              proximoContato: true,
              concluida: true,
              unidade: { select: { sigla: true } },
              operador: { select: { nome: true } },
              tentativas: {
                orderBy: { criadoEm: "asc" },
                select: {
                  criadoEm: true,
                  conseguiuFalar: true,
                  resultado: true,
                  dataAgendada: true,
                  proximoContato: true,
                  observacoes: true,
                  motivo: { select: { descricao: true } },
                  usuario: { select: { nome: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!cliente) throw new ErroHttp(404, "Cliente não encontrado");

  await auditar({ usuarioId: usuario.id, acao: ACOES.DADOS_TITULAR_CONSULTADOS, entidade: "clientes", entidadeId: id });
  return cliente;
}

/** Resultado de uma anonimização (sem dados pessoais). */
export type ResultadoAnonimizacao = { clienteId: number; revisoesEncerradas: number; observacoesApagadas: number };

/**
 * Apaga os dados pessoais de um cliente, numa transação:
 *  - nome vira "CLIENTE ANONIMIZADO <id>"; CPF/CNPJ e celular são removidos;
 *  - observações escritas nas ligações são apagadas (podem citar o cliente);
 *  - revisões ainda abertas saem da fila (viram "Não agendado", sem datas).
 * Ficam: município, moto (chassi, modelo, cor, data da venda) e as ligações
 * sem observação, para os relatórios e o cruzamento com as ordens de serviço.
 *
 * @param motivo "PEDIDO_DO_TITULAR" (tela de Privacidade) ou "PRAZO_DE_GUARDA" (script de retenção)
 * @throws ErroHttp 404 cliente não encontrado; 409 já anonimizado
 */
export async function anonimizarCliente(
  id: number,
  usuarioId: number | null,
  motivo: "PEDIDO_DO_TITULAR" | "PRAZO_DE_GUARDA",
): Promise<ResultadoAnonimizacao> {
  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({ where: { id }, select: { anonimizadoEm: true } });
    if (!cliente) throw new ErroHttp(404, "Cliente não encontrado");
    if (cliente.anonimizadoEm) throw new ErroHttp(409, "Este cliente já foi anonimizado.");

    await tx.cliente.update({
      where: { id },
      data: { nome: `CLIENTE ANONIMIZADO ${id}`, cpfCnpj: null, celular: null, anonimizadoEm: new Date() },
    });

    const doCliente = { veiculo: { clienteId: id } };
    const observacoes = await tx.tentativaContato.updateMany({
      where: { revisao: doCliente, observacoes: { not: null } },
      data: { observacoes: null },
    });
    const encerradas = await tx.revisaoAlvo.updateMany({
      where: { ...doCliente, situacao: { in: SITUACOES_ABERTAS } },
      data: {
        situacao: SituacaoRevisao.NAO_AGENDADO,
        dataAgendada: null,
        proximoContato: null,
        versao: { increment: 1 },
      },
    });

    const resultado = { clienteId: id, revisoesEncerradas: encerradas.count, observacoesApagadas: observacoes.count };
    await auditar(
      {
        usuarioId,
        acao: ACOES.CLIENTE_ANONIMIZADO,
        entidade: "clientes",
        entidadeId: id,
        detalhes: { motivo, revisoesEncerradas: encerradas.count, observacoesApagadas: observacoes.count },
      },
      tx,
    );
    return resultado;
  });
}

/**
 * Clientes que passaram do prazo de guarda: nenhuma revisão aberta e nenhuma
 * movimentação (revisão alterada ou ligação registrada) há mais de `meses`.
 * Ainda não anonimizados. Usa SQL direto porque precisa do "maior entre datas".
 */
export async function clientesForaDoPrazo(meses: number): Promise<{ id: number; ultimaMovimentacao: Date }[]> {
  return prisma.$queryRaw<{ id: number; ultimaMovimentacao: Date }[]>(Prisma.sql`
    SELECT c.id, GREATEST(c.atualizado_em, MAX(r.atualizado_em), MAX(t.criado_em)) AS "ultimaMovimentacao"
    FROM clientes c
    LEFT JOIN veiculos v ON v.cliente_id = c.id
    LEFT JOIN revisoes_alvo r ON r.veiculo_id = v.id
    LEFT JOIN tentativas_contato t ON t.revisao_id = r.id
    WHERE c.anonimizado_em IS NULL
    GROUP BY c.id
    HAVING COUNT(*) FILTER (WHERE r.situacao::text IN (${Prisma.join(SITUACOES_ABERTAS)})) = 0
       AND GREATEST(c.atualizado_em, MAX(r.atualizado_em), MAX(t.criado_em)) < NOW() - make_interval(months => ${meses})
    ORDER BY c.id
  `);
}
