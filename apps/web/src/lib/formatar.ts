/**
 * lib/formatar.ts — Formatos para exibir na tela
 *
 * A API devolve valores "crus" (enum PENDENTE, celular só com números, datas
 * em ISO/UTC). Estas funções transformam em texto para as pessoas.
 * A API tem as mesmas regras em apps/api/src/lib/formatar.ts (usadas no CSV).
 */

import type { ResultadoContato, SituacaoRevisao } from './api.ts'

/** Nome e cor (classe de badge do Bootstrap) de cada situação da fila. */
export const SITUACOES: Record<SituacaoRevisao, { rotulo: string; badge: string }> = {
  PENDENTE: { rotulo: 'Pendente', badge: 'text-bg-secondary' },
  RETORNAR: { rotulo: 'Retornar', badge: 'text-bg-warning' },
  AGENDADO: { rotulo: 'Agendado', badge: 'text-bg-info' },
  NAO_AGENDADO: { rotulo: 'Não agendado', badge: 'text-bg-danger' },
  BUSCAR_CONTATO: { rotulo: 'Buscar contato', badge: 'text-bg-dark' },
  CONCLUIDA: { rotulo: 'Concluída', badge: 'text-bg-success' },
}

/** Revisões possíveis, em km (mesma lista da API: schemas/revisoes.ts). */
export const KMS_REVISAO = [1000, 6000, 12000, 18000] as const

/** Data ISO → "dd/mm/aaaa" no fuso do Maranhão. Traço se não houver data. */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })
}

/**
 * Datas SÓ DIA (data agendada, próximo contato) chegam como meia-noite UTC.
 * Não podem passar pelo fuso do Maranhão (UTC-3), senão mostrariam o dia
 * anterior. Por isso usam timeZone UTC. Mesma regra da API (lib/datas.ts).
 */
export function diaBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

/** Data e hora no fuso do Maranhão: "12/11/2026 14:05". */
export function dataHoraBR(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Fortaleza',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** Hoje no fuso do Maranhão, mais `dias`, como "AAAA-MM-DD" (formato do <input type="date">). */
export function diaISO(dias = 0): string {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date())
  const d = new Date(`${hoje}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Texto da resposta "Agendou?" como na planilha. */
export const ROTULO_RESULTADO: Record<ResultadoContato, string> = {
  SIM: 'Agendou',
  NAO: 'Não agendou',
  RETORNAR: 'Retornar',
}

/** Celular só com dígitos e com DDI 55, para links de WhatsApp. undefined se não houver. */
export function celularWhatsApp(celular: string | null | undefined): string | undefined {
  const d = (celular ?? '').replace(/\D/g, '')
  return d.length >= 10 ? `55${d}` : undefined
}

/** "98900000001" → "(98) 90000-0001". Devolve o original se não reconhecer o formato. */
export function celularBR(celular: string | null | undefined): string {
  if (!celular) return '—'
  const d = celular.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return celular
}

/**
 * Escolhe singular ou plural conforme a quantidade, já com o número na frente.
 * @example plural(1, 'revisão', 'revisões') → "1 revisão"; plural(3, ...) → "3 revisões"
 */
export function plural(qtd: number, singular: string, pluralTexto: string): string {
  return `${qtd.toLocaleString('pt-BR')} ${qtd === 1 ? singular : pluralTexto}`
}

/** 6000 → "6.000 km" */
export function kmBR(km: number): string {
  return `${km.toLocaleString('pt-BR')} km`
}
