/**
 * schemas/atendimentos.ts — Formato aceito ao registrar contatos (Etapa 8)
 *
 * Reproduz o formulário da planilha com as validações que faltavam nela
 * (docs/regras-de-negocio.md, seção 4, "Problemas de qualidade"):
 *  - "Agendou? = sim" exige data agendada e não aceita motivo;
 *  - "Agendou? = não/retornar" exige motivo;
 *  - só dá para agendar se conseguiu falar com o cliente;
 *  - datas precisam existir e estar entre hoje e daqui a 1 ano.
 *
 * A regra que depende do motivo escolhido (próximo contato obrigatório quando
 * a revisão volta para a fila) fica no serviço, que consulta o motivo no banco.
 */

import { z } from "zod";
import { ResultadoContato } from "../generated/prisma/client.js";
import { hoje, paraDia, somarDias } from "../lib/datas.js";

/** Até quantos dias à frente se pode agendar ou marcar um novo contato. */
export const MAX_DIAS_FUTURO = 365;

/** Id numérico vindo da URL (/api/revisoes/12). */
export const idRevisaoSchema = z.coerce.number().int().positive({ message: "Id de revisão inválido" });

/**
 * Data só dia (AAAA-MM-DD), de hoje até MAX_DIAS_FUTURO dias à frente.
 * Vazio ou ausente = não informada. Sai como Date (meia-noite UTC).
 */
const diaFuturo = z
  .preprocess((v) => (v === "" ? undefined : v), z.string().optional())
  .transform((texto, ctx) => {
    if (texto === undefined) return undefined;
    const data = paraDia(texto);
    if (!data) {
      ctx.addIssue({ code: "custom", message: "Data inválida (use AAAA-MM-DD)" });
      return z.NEVER;
    }
    if (texto < hoje()) {
      ctx.addIssue({ code: "custom", message: "A data não pode estar no passado" });
      return z.NEVER;
    }
    if (texto > somarDias(hoje(), MAX_DIAS_FUTURO)) {
      ctx.addIssue({ code: "custom", message: `A data deve estar nos próximos ${MAX_DIAS_FUTURO} dias` });
      return z.NEVER;
    }
    return data;
  });

/** Corpo de POST /api/revisoes/:id/tentativas */
export const registrarTentativaSchema = z
  .object({
    /** Versão da revisão que a tela mostrava (proteção contra sobrescrita). */
    versao: z.number().int().positive(),
    /** "Conseguiu falar?" */
    conseguiuFalar: z.boolean(),
    /** "Agendou?" */
    resultado: z.enum(ResultadoContato),
    motivoId: z.number().int().positive().nullish(),
    dataAgendada: diaFuturo,
    proximoContato: diaFuturo,
    observacoes: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(1000).optional(),
    ),
  })
  .superRefine((d, ctx) => {
    if (d.resultado === ResultadoContato.SIM) {
      if (!d.conseguiuFalar) {
        ctx.addIssue({ code: "custom", path: ["resultado"], message: "Para agendar, é preciso ter falado com o cliente" });
      }
      if (!d.dataAgendada) {
        ctx.addIssue({ code: "custom", path: ["dataAgendada"], message: "Informe a data agendada" });
      }
      if (d.motivoId) {
        ctx.addIssue({ code: "custom", path: ["motivoId"], message: "Quem agendou não tem motivo de não agendamento" });
      }
    } else if (!d.motivoId) {
      ctx.addIssue({ code: "custom", path: ["motivoId"], message: "Escolha o motivo" });
    }
  });

export type RegistrarTentativaParams = z.infer<typeof registrarTentativaSchema>;

/** Corpo de PATCH /api/revisoes/:id/concluir */
export const concluirSchema = z.object({
  versao: z.number().int().positive(),
  /** true = revisão feita na oficina; false = reabrir (volta para a situação do último contato). */
  concluida: z.boolean(),
});

export type ConcluirParams = z.infer<typeof concluirSchema>;
