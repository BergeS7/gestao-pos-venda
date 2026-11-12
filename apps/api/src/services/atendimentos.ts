/**
 * services/atendimentos.ts — Registro de contatos com o cliente (Etapa 8)
 *
 * Regras de negócio da tela do cliente:
 *  - cada ligação vira uma TENTATIVA no histórico da revisão (nada é apagado
 *    nem reescrito; a planilha criava linhas repetidas);
 *  - a SITUAÇÃO da revisão é sempre consequência da última tentativa
 *    (ver `efeitoDaTentativa`);
 *  - a OPERADORA só acessa revisões da própria carteira (as outras respondem
 *    404, como se não existissem); toda gravação vai para a auditoria (Etapa 9);
 *  - PROTEÇÃO CONTRA SOBRESCRITA (optimistic locking): toda gravação informa a
 *    `versao` que a tela mostrava. Se outra pessoa gravou antes, a versão do
 *    banco já mudou, nada é gravado e a resposta é 409.
 *
 * Funções:
 *  - detalharRevisao   → dados da tela do cliente + histórico
 *  - registrarTentativa → grava uma ligação e atualiza a revisão
 *  - concluirRevisao   → marca como feita na oficina, ou reabre
 */

import { prisma } from "../db/prisma.js";
import {
  AcaoMotivo,
  Perfil,
  Prisma,
  ResultadoContato,
  SituacaoRevisao,
} from "../generated/prisma/client.js";
import { ErroHttp } from "../lib/erros.js";
import type { UsuarioLogado } from "../middleware/auth.js";
import { ACOES, auditar } from "./auditoria.js";
import type { ConcluirParams, RegistrarTentativaParams } from "../schemas/atendimentos.js";
import { camposRevisao } from "./revisoes.js";

/** Código enviado em `detalhes` quando a revisão foi alterada por outra pessoa. */
export const CODIGO_VERSAO_DESATUALIZADA = "VERSAO_DESATUALIZADA";

// ---------------------------------------------------------------------------
// Regra central: o que uma tentativa faz com a revisão
// ---------------------------------------------------------------------------

/** Como a revisão fica depois de uma tentativa. */
export type EfeitoTentativa = {
  situacao: SituacaoRevisao;
  dataAgendada: Date | null;
  proximoContato: Date | null;
};

/**
 * Decide a nova situação da revisão a partir da resposta "Agendou?" e do motivo.
 * Função pura (sem banco), para ser fácil de entender e de testar.
 *
 * | Agendou?  | Ação do motivo  | Situação       | Datas guardadas           |
 * |-----------|-----------------|----------------|---------------------------|
 * | SIM       | —               | AGENDADO       | data agendada             |
 * | RETORNAR  | qualquer        | RETORNAR       | próximo contato           |
 * | NAO       | RETORNAR        | RETORNAR       | próximo contato           |
 * | NAO       | BUSCAR_CONTATO  | BUSCAR_CONTATO | próximo contato, se houver|
 * | NAO       | ENCERRAR        | NAO_AGENDADO   | nenhuma (sai da fila)     |
 */
export function efeitoDaTentativa(
  resultado: ResultadoContato,
  acaoMotivo: AcaoMotivo | null,
  dataAgendada: Date | null,
  proximoContato: Date | null,
): EfeitoTentativa {
  if (resultado === ResultadoContato.SIM) {
    return { situacao: SituacaoRevisao.AGENDADO, dataAgendada, proximoContato: null };
  }
  if (resultado === ResultadoContato.RETORNAR || acaoMotivo === AcaoMotivo.RETORNAR) {
    return { situacao: SituacaoRevisao.RETORNAR, dataAgendada: null, proximoContato };
  }
  if (acaoMotivo === AcaoMotivo.BUSCAR_CONTATO) {
    return { situacao: SituacaoRevisao.BUSCAR_CONTATO, dataAgendada: null, proximoContato };
  }
  return { situacao: SituacaoRevisao.NAO_AGENDADO, dataAgendada: null, proximoContato: null };
}

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

/** Campos de cada tentativa no histórico. */
const camposTentativa = {
  id: true,
  criadoEm: true,
  conseguiuFalar: true,
  resultado: true,
  dataAgendada: true,
  proximoContato: true,
  observacoes: true,
  motivo: { select: { id: true, descricao: true } },
  usuario: { select: { id: true, nome: true } },
} satisfies Prisma.TentativaContatoSelect;

/**
 * Condição de acesso: a operadora só alcança revisões atribuídas a ela.
 * Os demais perfis alcançam todas.
 */
function filtroDeAcesso(id: number, usuario: UsuarioLogado): Prisma.RevisaoAlvoWhereInput {
  return usuario.perfil === Perfil.OPERADORA ? { id, operadorId: usuario.id } : { id };
}

/**
 * Confere, antes de gravar, se o usuário pode mexer nesta revisão.
 * Se ela for reatribuída logo depois, a versão muda e a gravação dá 409.
 * @throws ErroHttp 404 se não existir ou for da carteira de outra operadora
 */
async function garantirAcesso(id: number, usuario: UsuarioLogado) {
  const existe = await prisma.revisaoAlvo.findFirst({ where: filtroDeAcesso(id, usuario), select: { id: true } });
  if (!existe) throw new ErroHttp(404, "Revisão não encontrada");
}

/**
 * Dados da tela do cliente: a revisão (mesmos campos da fila, sem CPF) e o
 * histórico de tentativas, da mais nova para a mais antiga.
 *
 * @throws ErroHttp 404 se a revisão não existir ou o usuário não tiver acesso a ela.
 */
export async function detalharRevisao(id: number, usuario: UsuarioLogado) {
  const revisao = await prisma.revisaoAlvo.findFirst({
    where: filtroDeAcesso(id, usuario),
    select: {
      ...camposRevisao,
      tentativas: { select: camposTentativa, orderBy: [{ criadoEm: "desc" }, { id: "desc" }] },
    },
  });
  if (!revisao) throw new ErroHttp(404, "Revisão não encontrada");
  return revisao;
}

// ---------------------------------------------------------------------------
// Gravações
// ---------------------------------------------------------------------------

/**
 * Explica por que uma gravação condicionada à versão não alterou nada.
 * Chamada só quando o `updateMany` devolveu 0 linhas.
 */
async function erroDeGravacao(tx: Prisma.TransactionClient, id: number, exigirAberta: boolean): Promise<ErroHttp> {
  const atual = await tx.revisaoAlvo.findUnique({ where: { id }, select: { concluida: true } });
  if (!atual) return new ErroHttp(404, "Revisão não encontrada");
  if (exigirAberta && atual.concluida) {
    return new ErroHttp(409, "Esta revisão já foi concluída. Reabra-a antes de registrar um novo contato.", {
      codigo: "REVISAO_CONCLUIDA",
    });
  }
  return new ErroHttp(
    409,
    "Outra pessoa alterou esta revisão enquanto você editava. Recarregue para ver o que mudou; nada foi gravado.",
    { codigo: CODIGO_VERSAO_DESATUALIZADA },
  );
}

/**
 * Registra uma ligação e atualiza a situação da revisão, tudo numa transação:
 * ou grava as duas coisas, ou nenhuma.
 *
 * @throws ErroHttp 400 motivo inexistente, ou próximo contato faltando quando a revisão volta para a fila
 * @throws ErroHttp 404 revisão não encontrada
 * @throws ErroHttp 409 revisão concluída, ou alterada por outra pessoa (versão diferente)
 */
export async function registrarTentativa(usuario: UsuarioLogado, revisaoId: number, p: RegistrarTentativaParams) {
  await garantirAcesso(revisaoId, usuario);

  // 1. O motivo decide para onde a revisão vai
  let acaoMotivo: AcaoMotivo | null = null;
  if (p.motivoId) {
    const motivo = await prisma.motivo.findFirst({ where: { id: p.motivoId, ativo: true }, select: { acao: true } });
    if (!motivo) throw new ErroHttp(400, "Dados inválidos na requisição", { campos: { motivoId: ["Motivo não encontrado"] } });
    acaoMotivo = motivo.acao;
  }

  const efeito = efeitoDaTentativa(p.resultado, acaoMotivo, p.dataAgendada ?? null, p.proximoContato ?? null);

  // 2. Quem volta para a fila precisa de data para a nova ligação
  if (efeito.situacao === SituacaoRevisao.RETORNAR && !efeito.proximoContato) {
    throw new ErroHttp(400, "Dados inválidos na requisição", {
      campos: { proximoContato: ["Informe quando ligar de novo"] },
    });
  }

  // 3. Grava revisão + tentativa juntas
  await prisma.$transaction(async (tx) => {
    // Só altera se a versão for a mesma que a tela mostrava e se não estiver concluída
    const { count } = await tx.revisaoAlvo.updateMany({
      where: { id: revisaoId, versao: p.versao, concluida: false },
      data: { ...efeito, versao: { increment: 1 } },
    });
    if (count === 0) throw await erroDeGravacao(tx, revisaoId, true);

    // Autor: quem está logado (a operadora, ou um gestor cobrindo a carteira)
    const tentativa = await tx.tentativaContato.create({
      data: {
        revisaoId,
        usuarioId: usuario.id,
        conseguiuFalar: p.conseguiuFalar,
        resultado: p.resultado,
        motivoId: p.motivoId ?? null,
        dataAgendada: efeito.dataAgendada,
        proximoContato: efeito.proximoContato,
        observacoes: p.observacoes ?? null,
      },
      select: { id: true },
    });

    await auditar(
      {
        usuarioId: usuario.id,
        acao: ACOES.TENTATIVA_REGISTRADA,
        entidade: "revisoes_alvo",
        entidadeId: revisaoId,
        detalhes: { tentativaId: tentativa.id, resultado: p.resultado, situacao: efeito.situacao },
      },
      tx,
    );
  });

  return detalharRevisao(revisaoId, usuario);
}

/**
 * Marca a revisão como feita na oficina (concluida = true) ou reabre.
 * Ao reabrir, a situação volta a ser a do último contato (ou PENDENTE, se nunca houve).
 * Na Etapa 6, a conclusão também virá do espelhamento de OS do mês seguinte.
 *
 * @throws ErroHttp 404 revisão não encontrada
 * @throws ErroHttp 409 alterada por outra pessoa (versão diferente)
 */
export async function concluirRevisao(usuario: UsuarioLogado, revisaoId: number, { versao, concluida }: ConcluirParams) {
  await garantirAcesso(revisaoId, usuario);

  await prisma.$transaction(async (tx) => {
    let dados: Prisma.RevisaoAlvoUpdateManyMutationInput;
    if (concluida) {
      // Não há mais o que ligar. A data agendada fica, como registro de quando o cliente veio.
      dados = { situacao: SituacaoRevisao.CONCLUIDA, proximoContato: null };
    } else {
      const ultima = await tx.tentativaContato.findFirst({
        where: { revisaoId },
        orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
        select: { resultado: true, dataAgendada: true, proximoContato: true, motivo: { select: { acao: true } } },
      });
      dados = ultima
        ? efeitoDaTentativa(ultima.resultado, ultima.motivo?.acao ?? null, ultima.dataAgendada, ultima.proximoContato)
        : { situacao: SituacaoRevisao.PENDENTE, dataAgendada: null, proximoContato: null };
    }

    const { count } = await tx.revisaoAlvo.updateMany({
      where: { id: revisaoId, versao },
      data: { ...dados, concluida, versao: { increment: 1 } },
    });
    if (count === 0) throw await erroDeGravacao(tx, revisaoId, false);

    await auditar(
      {
        usuarioId: usuario.id,
        acao: concluida ? ACOES.REVISAO_CONCLUIDA : ACOES.REVISAO_REABERTA,
        entidade: "revisoes_alvo",
        entidadeId: revisaoId,
        detalhes: { situacao: dados.situacao ?? null },
      },
      tx,
    );
  });

  return detalharRevisao(revisaoId, usuario);
}
