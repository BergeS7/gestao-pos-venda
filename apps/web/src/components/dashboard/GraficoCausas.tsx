/**
 * components/dashboard/GraficoCausas.tsx — Por que falou e não agendou (Etapa 10)
 *
 * Barras deitadas, da causa mais comum para a menos comum, numa cor só
 * (é uma série só, então não precisa de legenda). A dica mostra a
 * quantidade e o % sobre o total de causas.
 */

import { Bar } from 'react-chartjs-2'
import type { ChartOptions, TooltipItem } from 'chart.js'
import type { Relatorio } from '../../lib/api.ts'
import { porcentagem } from '../../lib/formatar.ts'
import { COR_GRADE, COR_SERIE_UNICA } from '../../lib/graficos.ts'

type Props = {
  causasResumo: Relatorio['causasResumo']
}

export default function GraficoCausas({ causasResumo }: Props) {
  const dados = {
    labels: causasResumo.map((c) => c.motivo),
    datasets: [
      {
        label: 'Clientes',
        data: causasResumo.map((c) => c.quantidade),
        backgroundColor: COR_SERIE_UNICA,
        borderRadius: { topRight: 4, bottomRight: 4 },
        borderSkipped: 'left' as const,
        maxBarThickness: 22,
      },
    ],
  }

  const opcoes: ChartOptions<'bar'> = {
    indexAxis: 'y', // barras deitadas: nomes longos de motivo cabem melhor
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'bar'>) =>
            ` ${item.formattedValue} clientes (${porcentagem(causasResumo[item.dataIndex].percentual)})`,
        },
      },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: COR_GRADE }, border: { display: false } },
      y: { grid: { display: false } },
    },
  }

  // Altura cresce com o número de motivos, para as barras não ficarem espremidas
  const altura = Math.max(160, causasResumo.length * 36 + 40)

  return (
    <div
      className="grafico"
      style={{ height: altura }}
      role="img"
      aria-label="Gráfico de barras: causas de falou e não agendou"
    >
      <Bar data={dados} options={opcoes} />
    </div>
  )
}
