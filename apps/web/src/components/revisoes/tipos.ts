/**
 * components/revisoes/tipos.ts — Tipos compartilhados pelos componentes da fila
 */

/**
 * Filtros da fila, como ficam na URL (?unidade=STI&km=1000...).
 * Tudo em texto: "" significa "sem filtro". A API valida e converte.
 */
export type FiltrosFila = {
  /** Nome do cliente, chassi ou celular. */
  busca: string
  /** Sigla da unidade (STI, ZDC, BRT). */
  unidade: string
  /** Id da operadora, ou "sem" para revisões sem operadora. */
  operador: string
  /** 1000, 6000, 12000 ou 18000. */
  km: string
  /** PENDENTE, RETORNAR, AGENDADO... */
  situacao: string
  /** Mês da venda, AAAA-MM. */
  mesVenda: string
}

/** Nomes dos campos de filtro, na ordem em que aparecem na URL. */
export const CAMPOS_FILTRO: (keyof FiltrosFila)[] = ['busca', 'unidade', 'operador', 'km', 'situacao', 'mesVenda']
