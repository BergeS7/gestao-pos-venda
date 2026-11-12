/**
 * lib/graficos.ts — Configuração comum dos gráficos (Etapa 10)
 *
 * Os gráficos usam Chart.js (https://www.chartjs.org) pelo pacote
 * react-chartjs-2. O Chart.js só carrega as peças que forem "registradas",
 * o que deixa o arquivo final menor: aqui registramos apenas o que o
 * Dashboard usa (barras, eixos, legenda e dica ao passar o mouse).
 *
 * Cores: as 4 etapas do funil (total → falou → agendou → concluiu) usam UM
 * tom de vermelho da marca, do mais claro ao mais escuro. É uma escala
 * "ordinal": a cor fica mais forte conforme o cliente avança. A escala foi
 * conferida com o validador de paleta (claridade crescente, diferença visível
 * entre vizinhas e contraste mínimo com o fundo branco).
 */

import { BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip } from 'chart.js'

Chart.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip)

// Fonte e cores de texto iguais às do resto do sistema
Chart.defaults.font.family = "'Montserrat', system-ui, sans-serif"
Chart.defaults.font.size = 12
Chart.defaults.color = '#5c5c5c'

/** Etapas do funil, do mais claro (total) ao mais escuro (concluídos). */
export const CORES_FUNIL = {
  total: '#e47a7a',
  falou: '#d43c3c',
  agendados: '#a80000',
  concluidos: '#5e0000',
} as const

/** Cor única para gráficos de uma série só (ex.: causas). */
export const COR_SERIE_UNICA = '#5c5c5c'

/** Linhas de grade discretas, para não competir com as barras. */
export const COR_GRADE = '#ececec'
