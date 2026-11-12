/**
 * services/revisoes.ts — Regras de negócio da fila de revisões
 *
 * Camada de SERVIÇO: aqui ficam as consultas e regras. As rotas
 * (routes/revisoes.ts) só validam a requisição HTTP e chamam estas funções.
 * Vantagem: as regras podem ser testadas sem HTTP e reaproveitadas.
 *
 * Funções:
 *  - listarRevisoes      → tela da fila (filtros + paginação)
 *  - listarParaExportar  → mesmas linhas, sem paginação, para o CSV
 *  - atribuirOperadora   → revisões selecionadas → uma operadora
 *  - distribuirRevisoes  → revisões sem operadora → várias operadoras, em partes iguais
 */

import { prisma } from "../db/prisma.js";
import { Prisma, SituacaoRevisao } from "../generated/prisma/client.js";
import type { UsuarioLogado } from "../middleware/auth.js";
import { ACOES, auditar } from "./auditoria.js";
import { ErroHttp } from "../lib/erros.js";
import type {
  AtribuirParams,
  DistribuirParams,
  FiltrosRevisoes,
  ListarRevisoesParams,
} from "../schemas/revisoes.js";

// ---------------------------------------------------------------------------
// Campos devolvidos
// ---------------------------------------------------------------------------

/**
 * Campos de cada revisão enviados ao frontend.
 * `select` explícito: só o necessário. CPF/CNPJ NUNCA sai na listagem.
 * `satisfies` faz o TypeScript conferir o formato sem perder o tipo exato.
 */
export const camposRevisao = {
  id: true,
  km: true,
  situacao: true,
  dataAgendada: true,
  proximoContato: true,
  concluida: true,
  versao: true,
  veiculo: {
    select: {
      chassi: true,
      modelo: true,
      cor: true,
      dataVenda: true,
      cliente: { select: { id: true, nome: true, celular: true, municipio: true } },
    },
  },
  unidade: { select: { sigla: true, nome: true } },
  operador: { select: { id: true, nome: true } },
} satisfies Prisma.RevisaoAlvoSelect;

/**
 * Ordem padrão da fila: quem tem próximo contato marcado primeiro (mais
 * próximo antes), depois o restante pela ordem de entrada.
 */
const ordemPadrao: Prisma.RevisaoAlvoOrderByWithRelationInput[] = [
  { proximoContato: { sort: "asc", nulls: "last" } },
  { id: "asc" },
];

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/**
 * Converte os filtros da tela na condição (WHERE) do Prisma.
 * Usada pela listagem, pela exportação e pela distribuição, para que as três
 * sempre enxerguem exatamente o mesmo conjunto de revisões.
 */
export function montarFiltro(f: FiltrosRevisoes): Prisma.RevisaoAlvoWhereInput {
  const where: Prisma.RevisaoAlvoWhereInput = {};

  if (f.busca) {
    const digitos = f.busca.replace(/\D/g, "");
    where.OR = [
      { veiculo: { cliente: { nome: { contains: f.busca, mode: "insensitive" } } } },
      { veiculo: { chassi: { contains: f.busca.toUpperCase().replace(/\s/g, "") } } },
      // Celular é guardado só com números: busca pelos dígitos digitados
      ...(digitos.length >= 4 ? [{ veiculo: { cliente: { celular: { contains: digitos } } } }] : []),
    ];
  }

  if (f.unidade) where.unidade = { sigla: f.unidade };
  if (f.operador === "sem") where.operadorId = null;
  else if (f.operador !== undefined) where.operadorId = f.operador;
  if (f.km !== undefined) where.km = f.km;
  if (f.situacao) where.situacao = f.situacao;

  if (f.mesVenda) {
    // Intervalo [primeiro dia do mês, primeiro dia do mês seguinte), em UTC
    const [ano, mes] = f.mesVenda.split("-").map(Number);
    where.veiculo = {
      dataVenda: { gte: new Date(Date.UTC(ano, mes - 1, 1)), lt: new Date(Date.UTC(ano, mes, 1)) },
    };
  }

  return where;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Lista as revisões da fila (uma página), com veículo, cliente, unidade e operadora.
 *
 * @returns os itens da página e os dados de paginação
 */
export async function listarRevisoes({ pagina, porPagina, ...filtros }: ListarRevisoesParams) {
  const where = montarFiltro(filtros);

  // As duas consultas rodam em paralelo (Promise.all). Não usamos $transaction:
  // com o adapter pg ela dispara consultas simultâneas na mesma conexão, o que
  // o driver marca como obsoleto. Numa listagem, a pequena chance de o total
  // mudar entre as duas consultas não causa problema.
  const [itens, total] = await Promise.all([
    prisma.revisaoAlvo.findMany({
      where,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: ordemPadrao,
      select: camposRevisao,
    }),
    prisma.revisaoAlvo.count({ where }),
  ]);

  return { itens, total, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
}

/** Limite de linhas de uma exportação (proteção contra arquivos gigantes). */
export const MAX_EXPORTACAO = 20_000;

/**
 * Todas as revisões do filtro, sem paginação, para gerar o arquivo de exportação.
 *
 * @throws ErroHttp 413 se o filtro trouxer mais que MAX_EXPORTACAO linhas
 */
export async function listarParaExportar(filtros: FiltrosRevisoes) {
  const where = montarFiltro(filtros);
  const total = await prisma.revisaoAlvo.count({ where });
  if (total > MAX_EXPORTACAO) {
    throw new ErroHttp(
      413,
      `A exportação tem ${total} linhas; o limite é ${MAX_EXPORTACAO}. Use mais filtros.`,
    );
  }
  return prisma.revisaoAlvo.findMany({ where, orderBy: ordemPadrao, select: camposRevisao });
}

// ---------------------------------------------------------------------------
// Atribuição e distribuição entre operadoras
// ---------------------------------------------------------------------------

/**
 * Confere se todas as operadoras existem e estão ativas.
 * @throws ErroHttp 404 com a lista dos ids inválidos
 */
async function garantirOperadorasAtivas(ids: number[]) {
  const encontradas = await prisma.usuario.findMany({
    where: { id: { in: ids }, ativo: true },
    select: { id: true },
  });
  const validas = new Set(encontradas.map((u) => u.id));
  const invalidas = ids.filter((id) => !validas.has(id));
  if (invalidas.length > 0) {
    throw new ErroHttp(404, "Operadora não encontrada ou inativa", { ids: invalidas });
  }
}

/**
 * Atribui as revisões selecionadas a uma operadora (ou tira a operadora, se `operadorId` for null).
 *
 * Cada revisão alterada tem a `versao` incrementada. Isso prepara a proteção
 * contra sobrescrita da Etapa 8: uma tela com dados antigos vai perceber a mudança.
 *
 * @returns quantas revisões foram atualizadas
 */
export async function atribuirOperadora(autor: UsuarioLogado, { ids, operadorId }: AtribuirParams) {
  if (operadorId !== null) await garantirOperadorasAtivas([operadorId]);

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.revisaoAlvo.updateMany({
      where: { id: { in: ids } },
      data: { operadorId, versao: { increment: 1 } },
    });
    await auditar(
      { usuarioId: autor.id, acao: ACOES.REVISOES_ATRIBUIDAS, entidade: "revisoes_alvo", detalhes: { ids, operadorId, atualizadas: count } },
      tx,
    );
    return { atualizadas: count };
  });
}

/**
 * Distribui, em partes iguais, as revisões SEM operadora que atendem aos filtros.
 * Funciona como dar as cartas de um baralho: a 1ª revisão vai para a 1ª operadora,
 * a 2ª para a 2ª, e assim por diante, recomeçando a volta.
 *
 * Revisões concluídas não são distribuídas (não há mais o que ligar).
 * Roda dentro de uma transação: ou distribui tudo, ou nada.
 *
 * @returns o total distribuído e quantas revisões cada operadora recebeu
 */
export async function distribuirRevisoes(autor: UsuarioLogado, { operadorIds, filtros }: DistribuirParams) {
  await garantirOperadorasAtivas(operadorIds);

  const where: Prisma.RevisaoAlvoWhereInput = {
    AND: [
      montarFiltro({ ...filtros, operador: "sem" }),
      { situacao: { not: SituacaoRevisao.CONCLUIDA } },
    ],
  };

  return prisma.$transaction(async (tx) => {
    const revisoes = await tx.revisaoAlvo.findMany({ where, orderBy: ordemPadrao, select: { id: true } });

    // Separa os ids por operadora, em rodízio
    const porOperadora = new Map<number, number[]>(operadorIds.map((id) => [id, []]));
    revisoes.forEach((r, i) => porOperadora.get(operadorIds[i % operadorIds.length])!.push(r.id));

    // Uma atualização por operadora, uma de cada vez (a transação usa uma
    // única conexão, então os comandos não podem rodar em paralelo)
    const resumo: { operadorId: number; quantidade: number }[] = [];
    for (const [operadorId, ids] of porOperadora) {
      let quantidade = 0;
      if (ids.length > 0) {
        const { count } = await tx.revisaoAlvo.updateMany({
          // operadorId: null de novo aqui garante que nada atribuído por outra
          // pessoa no meio do caminho seja sobrescrito
          where: { id: { in: ids }, operadorId: null },
          data: { operadorId, versao: { increment: 1 } },
        });
        quantidade = count;
      }
      resumo.push({ operadorId, quantidade });
    }

    const distribuidas = resumo.reduce((soma, r) => soma + r.quantidade, 0);
    await auditar(
      {
        usuarioId: autor.id,
        acao: ACOES.REVISOES_DISTRIBUIDAS,
        entidade: "revisoes_alvo",
        detalhes: { filtros, distribuidas, porOperadora: resumo } as Prisma.InputJsonValue,
      },
      tx,
    );
    return { distribuidas, porOperadora: resumo };
  });
}
