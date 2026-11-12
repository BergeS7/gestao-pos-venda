/**
 * schemas/revisoes.ts — Formato aceito nas requisições da fila de revisões
 *
 * Cada schema descreve, com zod, o que a API aceita receber. As rotas usam
 * `validar(schema, dados)` (lib/validar.ts) e recebem os dados já convertidos
 * e tipados. Os tipos TypeScript são derivados dos schemas (z.infer), então
 * a validação e os tipos nunca ficam diferentes um do outro.
 */

import { z } from "zod";
import { SituacaoRevisao } from "../generated/prisma/client.js";

/** Revisões existentes, em km (docs/regras-de-negocio.md, seção 2.1). */
export const KMS_REVISAO = [1000, 6000, 12000, 18000] as const;

/** Máximo de itens por página na listagem (protege a API de consultas enormes). */
export const MAX_POR_PAGINA = 100;

/**
 * Campos de URL chegam como texto e, quando o usuário limpa um filtro, chegam
 * vazios (?unidade=). Este auxiliar trata "" como "não informado".
 */
function opcional<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
}

// ---------------------------------------------------------------------------
// Filtros (usados na listagem, na exportação e na distribuição)
// ---------------------------------------------------------------------------

export const filtrosRevisoesSchema = z.object({
  /** Texto livre: procura no nome do cliente, no chassi e no celular. */
  busca: opcional(z.string().trim().min(1).max(100)),

  /** Sigla da unidade (STI, ZDC, BRT). */
  unidade: opcional(z.string().trim().toUpperCase().max(10)),

  /** Id da operadora responsável, ou "sem" para as revisões ainda sem operadora. */
  operador: opcional(z.union([z.literal("sem"), z.coerce.number().int().positive()])),

  /** Revisão alvo (1000, 6000, 12000 ou 18000). Vem da URL como texto. */
  km: opcional(
    z.coerce
      .number()
      .refine((n) => (KMS_REVISAO as readonly number[]).includes(n), {
        message: `km deve ser um destes: ${KMS_REVISAO.join(", ")}`,
      }),
  ),

  /** Situação na fila (PENDENTE, RETORNAR, AGENDADO...). */
  situacao: opcional(z.enum(SituacaoRevisao)),

  /** Mês da venda da moto, no formato AAAA-MM (ex.: 2026-07). */
  mesVenda: opcional(
    z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "mesVenda deve estar no formato AAAA-MM" }),
  ),
});

/** Filtros já validados. */
export type FiltrosRevisoes = z.infer<typeof filtrosRevisoesSchema>;

// ---------------------------------------------------------------------------
// Listagem: filtros + paginação
// ---------------------------------------------------------------------------

export const listarRevisoesSchema = filtrosRevisoesSchema.extend({
  pagina: opcional(z.coerce.number().int().min(1)).default(1),
  porPagina: opcional(z.coerce.number().int().min(1).max(MAX_POR_PAGINA)).default(20),
});

export type ListarRevisoesParams = z.infer<typeof listarRevisoesSchema>;

// ---------------------------------------------------------------------------
// Atribuição manual: revisões selecionadas → uma operadora
// ---------------------------------------------------------------------------

export const atribuirSchema = z.object({
  /** Ids das revisões selecionadas na tela (até 500 por vez). */
  ids: z.array(z.number().int().positive()).min(1, "Selecione ao menos uma revisão").max(500),
  /** Operadora que vai assumir. `null` = tirar a operadora (voltar para "sem operadora"). */
  operadorId: z.number().int().positive().nullable(),
});

export type AtribuirParams = z.infer<typeof atribuirSchema>;

// ---------------------------------------------------------------------------
// Distribuição automática: revisões SEM operadora do filtro → várias operadoras
// ---------------------------------------------------------------------------

export const distribuirSchema = z.object({
  /** Operadoras que vão receber as revisões, em partes iguais. */
  operadorIds: z
    .array(z.number().int().positive())
    .min(1, "Escolha ao menos uma operadora")
    .max(20)
    .refine((ids) => new Set(ids).size === ids.length, { message: "Operadora repetida na lista" }),
  /** Mesmo formato dos filtros da tela; só as revisões sem operadora são distribuídas. */
  filtros: filtrosRevisoesSchema.default({}),
});

export type DistribuirParams = z.infer<typeof distribuirSchema>;
