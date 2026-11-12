/**
 * components/dashboard/GraficoProducao.tsx — Funil de cada operadora (Etapa 10)
 *
 * Barras agrupadas: para cada operadora, 4 barras (total, falou, agendados,
 * concluídos), do vermelho claro ao escuro. Passar o mouse mostra o número
 * e a taxa daquela etapa. Os mesmos números estão nas tabelas abaixo, para
 * quem preferir ler (ou não distinguir bem as cores).
 */

import { Bar } from 'react-chartjs-2'
import type { ChartOptions, TooltipItem } from 'chart.js'
import type { Relatorio } from '../../lib/api.ts'
import { porcentagem } from '../../lib/formatar.ts'
import { COR_GRADE, CORES_FUNIL } from '../../lib/graficos.ts'

type Props = {
  porOperadora: Relatorio['porOperadora']
}

/** Etapas do funil: rótulo, campo do número e taxa mostrada na dica. */
const ETAPAS = [
  { rotulo: 'Total de clientes', campo: 'total', taxa: null },
  { rotulo: 'Conseguiu falar', campo: 'falou', taxa: 'taxaContato' },
  { rotulo: 'Agendados', campo: 'agendados', taxa: 'taxaAgendamento' },
  { rotulo: 'Concluídos', campo: 'concluidos', taxa: 'taxaConclusao' },
] as const

export default function GraficoProducao({ porOperadora }: Props) {
  const dados = {
    labels: porOperadora.map((o) => o.operadora.nome),
    datasets: ETAPAS.map((e) => ({
      label: e.rotulo,
      data: porOperadora.map((o) => o[e.campo]),
      backgroundColor: CORES_FUNIL[e.campo],
      // Barras finas com cantos arredondados só no topo e um respiro entre elas
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: 'bottom' as const,
      maxBarThickness: 28,
      categoryPercentage: 0.7,
      barPercentage: 0.9,
    })),
  }

  const opcoes: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false }, // dica mostra as 4 etapas da operadora
    plugins: {
      legend: { position: 'top', align: 'start', labels: { boxWidth: 12, boxHeight: 12 } },
      tooltip: {
        callbacks: {
          // "Agendados: 12 (40,0%)"
          label: (item: TooltipItem<'bar'>) => {
            const etapa = ETAPAS[item.datasetIndex]
            const taxa = etapa.taxa ? ` (${porcentagem(porOperadora[item.dataIndex][etapa.taxa])})` : ''
            return ` ${etapa.rotulo}: ${item.formattedValue}${taxa}`
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: COR_GRADE }, border: { display: false } },
    },
  }

  return (
    <div className="grafico" role="img" aria-label="Gráfico de barras: total, falou, agendados e concluídos por operadora">
      <Bar data={dados} options={opcoes} />
    </div>
  )
}
