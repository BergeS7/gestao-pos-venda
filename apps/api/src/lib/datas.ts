/**
 * lib/datas.ts — Datas "só dia" (sem hora)
 *
 * Data agendada e próximo contato são só DIA, guardados no banco como DATE
 * (ver schema.prisma). O Prisma devolve esses campos como Date à meia-noite
 * UTC. Por isso eles NÃO podem passar por conversão de fuso: no horário do
 * Maranhão (UTC-3), meia-noite UTC ainda é o dia anterior.
 *
 * Regra do projeto:
 *  - data com hora (data de venda, criado em) → dataBR(), em lib/formatar.ts;
 *  - data só dia (agendada, próximo contato) → as funções deste arquivo.
 */

/** Fuso da operação (Santa Inês, Zé Doca e Buriticupu). */
export const FUSO = "America/Fortaleza";

/** Formato aceito na API para datas só dia: AAAA-MM-DD. */
export const REGEX_DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte "AAAA-MM-DD" em Date (meia-noite UTC), ou null se a data não
 * existir no calendário (ex.: 2026-02-31).
 */
export function paraDia(texto: string): Date | null {
  if (!REGEX_DIA.test(texto)) return null;
  const data = new Date(`${texto}T00:00:00.000Z`);
  // new Date("2026-02-31") vira 3 de março; a volta para texto denuncia isso
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto ? data : null;
}

/** Hoje no fuso da operação, como "AAAA-MM-DD". */
export function hoje(): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

/** Soma dias a um "AAAA-MM-DD" e devolve no mesmo formato. */
export function somarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Data só dia no formato brasileiro (dd/mm/aaaa). Vazio se não houver. */
export function diaBR(data: Date | null | undefined): string {
  if (!data) return "";
  // timeZone UTC de propósito: ver o comentário do topo do arquivo
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
