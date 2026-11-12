/**
 * services/auditoria.ts — Registro de quem alterou o quê e quando (Etapa 9)
 *
 * Toda gravação importante chama `auditar(...)`, de preferência DENTRO da
 * mesma transação da alteração: assim, ou a alteração e o registro ficam
 * gravados juntos, ou nenhum dos dois.
 *
 * A tabela `auditoria` só recebe inserções; nada é editado nem apagado.
 * ⚠️ Nunca coloque senhas, hashes ou CPF em `detalhes`.
 */

import { prisma } from "../db/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

/** Códigos de ação usados na auditoria (texto curto, fácil de filtrar). */
export const ACOES = {
  LOGIN: "LOGIN",
  LOGIN_FALHOU: "LOGIN_FALHOU",
  SENHA_TROCADA: "SENHA_TROCADA",
  TENTATIVA_REGISTRADA: "TENTATIVA_REGISTRADA",
  REVISAO_CONCLUIDA: "REVISAO_CONCLUIDA",
  REVISAO_REABERTA: "REVISAO_REABERTA",
  REVISOES_ATRIBUIDAS: "REVISOES_ATRIBUIDAS",
  REVISOES_DISTRIBUIDAS: "REVISOES_DISTRIBUIDAS",
  USUARIO_CRIADO: "USUARIO_CRIADO",
  USUARIO_ALTERADO: "USUARIO_ALTERADO",
  SENHA_REDEFINIDA: "SENHA_REDEFINIDA",
} as const;

export type AcaoAuditoria = (typeof ACOES)[keyof typeof ACOES];

/** Um registro de auditoria. */
export type EventoAuditoria = {
  /** Quem fez (null quando não há usuário identificado). */
  usuarioId: number | null;
  acao: AcaoAuditoria;
  /** Nome da tabela afetada, ex.: "revisoes_alvo". */
  entidade: string;
  entidadeId?: number | null;
  /** O que mudou, em JSON. Sem dados sensíveis. */
  detalhes?: Prisma.InputJsonValue;
};

/**
 * Grava um evento de auditoria.
 * @param tx Transação em andamento (recomendado); sem ela, grava direto.
 */
export async function auditar(evento: EventoAuditoria, tx: Prisma.TransactionClient = prisma): Promise<void> {
  await tx.auditoria.create({
    data: {
      usuarioId: evento.usuarioId,
      acao: evento.acao,
      entidade: evento.entidade,
      entidadeId: evento.entidadeId ?? null,
      detalhes: evento.detalhes,
    },
  });
}

/** Lista os eventos mais recentes (tela de auditoria do Admin). */
export async function listarAuditoria({ pagina, porPagina }: { pagina: number; porPagina: number }) {
  const [total, itens] = await prisma.$transaction([
    prisma.auditoria.count(),
    prisma.auditoria.findMany({
      orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        id: true,
        acao: true,
        entidade: true,
        entidadeId: true,
        detalhes: true,
        criadoEm: true,
        usuario: { select: { id: true, nome: true } },
      },
    }),
  ]);
  return { itens, total, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
}
