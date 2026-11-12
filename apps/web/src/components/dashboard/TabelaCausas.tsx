/**
 * components/dashboard/TabelaCausas.tsx — Causas por operadora × unidade (Etapa 10)
 *
 * Reproduz a aba de causas da planilha: para cada operadora e unidade, os
 * motivos de "falou e não agendou", com quantidade e % sobre o total geral.
 */

import type { Relatorio } from '../../lib/api.ts'
import { numeroBR, porcentagem } from '../../lib/formatar.ts'

type Props = {
  causas: Relatorio['causas']
  /** Mostra a coluna Operadora (a operadora logada só vê as próprias). */
  mostrarOperadora: boolean
}

export default function TabelaCausas({ causas, mostrarOperadora }: Props) {
  const total = causas.reduce((s, c) => s + c.quantidade, 0)

  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover align-middle mb-0 tabela-producao" aria-label="Causas de falou e não agendou por operadora e unidade">
        <thead>
          <tr>
            {mostrarOperadora && <th scope="col">Operadora</th>}
            <th scope="col">Unidade</th>
            <th scope="col">Motivo</th>
            <th scope="col" className="text-end">
              Qtd.
            </th>
            <th scope="col" className="text-end">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {causas.map((c) => (
            <tr key={`${c.operadora.id}|${c.unidade.sigla}|${c.motivo}`}>
              {mostrarOperadora && <td className="text-nowrap">{c.operadora.nome}</td>}
              <td>{c.unidade.sigla}</td>
              <td>{c.motivo}</td>
              <td className="text-end">{numeroBR(c.quantidade)}</td>
              <td className="text-end">{porcentagem(c.quantidade / total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="fw-bold">
            <td colSpan={mostrarOperadora ? 3 : 2}>Total geral</td>
            <td className="text-end">{numeroBR(total)}</td>
            <td className="text-end">{porcentagem(total ? 1 : null)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
