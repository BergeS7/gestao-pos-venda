/**
 * lib/formatar.ts — Formatos para exibir na tela
 *
 * A API devolve valores "crus" (enum PENDENTE, celular só com números, datas
 * em ISO/UTC). Estas funções transformam em texto para as pessoas.
 * A API tem as mesmas regras em apps/api/src/lib/formatar.ts (usadas no CSV).
 */

import type { SituacaoRevisao } from './api.ts'

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
