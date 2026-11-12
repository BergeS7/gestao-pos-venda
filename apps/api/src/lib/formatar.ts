/**
 * lib/formatar.ts — Textos e formatos para pessoas (exportações, mensagens)
 *
 * O banco guarda valores "crus" (enum PENDENTE, celular só com números, datas
 * em UTC). Aqui eles viram o texto que aparece num arquivo ou numa mensagem.
 * O frontend tem as mesmas regras em apps/web/src/lib/formatar.ts.
 */

import type { SituacaoRevisao } from "../generated/prisma/client.js";

/** Nome de cada situação da fila, como a equipe fala. */
export const ROTULO_SITUACAO: Record<SituacaoRevisao, string> = {
  PENDENTE: "Pendente",
  RETORNAR: "Retornar",
  AGENDADO: "Agendado",
  NAO_AGENDADO: "Não agendado",
  BUSCAR_CONTATO: "Buscar contato",
  CONCLUIDA: "Concluída",
};

/** Data no formato brasileiro (dd/mm/aaaa). Vazio se não houver data. */
export function dataBR(data: Date | null | undefined): string {
  if (!data) return "";
  // timeZone fixo: o mesmo dia para qualquer servidor, esteja onde estiver
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
}

/** Celular com máscara: "98900000001" → "(98) 90000-0001". Devolve o original se não reconhecer. */
export function celularBR(celular: string | null | undefined): string {
  if (!celular) return "";
  const d = celular.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return celular;
}
