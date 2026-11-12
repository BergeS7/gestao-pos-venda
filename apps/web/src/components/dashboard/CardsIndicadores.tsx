/**
 * components/dashboard/CardsIndicadores.tsx — Os 4 números do topo do Dashboard
 *
 * Cada card mostra um número do mês e, embaixo, a taxa que ele gera:
 *   Total de clientes → quantos não atenderam
 *   Conseguiu falar   → % sucesso no contato      (falou ÷ total)
 *   Agendados         → % sucesso no agendamento  (agendados ÷ falou)
 *   Concluídos        → % conclusão               (concluídos ÷ agendados)
 *                       e % concluídos da base    (concluídos ÷ total)
 * Estilo: .kpi-card em styles/_layout.scss.
 */

import type { Contagem } from '../../lib/api.ts'
import { numeroBR, porcentagem } from '../../lib/formatar.ts'

type Props = {
  total: Contagem
}

export default function CardsIndicadores({ total }: Props) {
  const cards = [
    {
      rotulo: 'Total de clientes',
      icone: 'bi-people',
      valor: total.total,
      detalhe: `${numeroBR(total.naoFalou)} não atenderam`,
    },
    {
      rotulo: 'Conseguiu falar',
      icone: 'bi-telephone-inbound',
      valor: total.falou,
      detalhe: `${porcentagem(total.taxaContato)} do total`,
    },
    {
      rotulo: 'Agendados',
      icone: 'bi-calendar-check',
      valor: total.agendados,
      detalhe: `${porcentagem(total.taxaAgendamento)} de quem falou`,
    },
    {
      rotulo: 'Concluídos',
      icone: 'bi-check2-circle',
      valor: total.concluidos,
      detalhe: `${porcentagem(total.taxaConclusao)} dos agendados · ${porcentagem(total.taxaConcluidosBase)} da base`,
    },
  ]

  return (
    // 2 por linha no celular (col-6), 4 em telas grandes (col-xl-3)
    <div className="row g-3 mb-4">
      {cards.map((c) => (
        <div key={c.rotulo} className="col-6 col-xl-3">
          <div className="kpi-card card h-100">
            <div className="card-body d-flex align-items-start justify-content-between gap-2">
              <div>
                <div className="kpi-label">{c.rotulo}</div>
                <div className="kpi-value">{numeroBR(c.valor)}</div>
                <div className="kpi-detalhe">{c.detalhe}</div>
              </div>
              <i className={`bi ${c.icone} kpi-icon`} aria-hidden="true" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
