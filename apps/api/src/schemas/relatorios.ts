/**
 * schemas/relatorios.ts — Filtros aceitos no relatório de produção (Etapa 10)
 *
 * Usado por GET /api/relatorios/producao e /producao/exportar.
 * Todos os campos são opcionais: sem `mes`, vale o mês atual (fuso do Maranhão).
 */

import { z } from "zod";
import { hoje } from "../lib/datas.js";

/** "" na URL (filtro limpo) conta como "não informado". */
function opcional<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
}

/** Formato do mês: AAAA-MM (ex.: 2026-10). */
export const REGEX_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export const relatorioSchema = z.object({
  /** Mês do relatório. Padrão: mês atual. */
  mes: z.preprocess(
    (v) => (v === "" || v === undefined ? hoje().slice(0, 7) : v),
    z.string().regex(REGEX_MES, { message: "mes deve estar no formato AAAA-MM" }),
  ),
  /** Sigla da unidade (STI, ZDC, BRT). */
  unidade: opcional(z.string().trim().toUpperCase().max(10)),
  /** Id da operadora. Para o perfil OPERADORA, a rota força o próprio id. */
  operador: opcional(z.coerce.number().int().positive()),
});

/** Filtros já validados. */
export type FiltrosRelatorio = z.infer<typeof relatorioSchema>;
