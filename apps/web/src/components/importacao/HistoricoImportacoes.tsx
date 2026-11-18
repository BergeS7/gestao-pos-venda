/**
 * components/importacao/HistoricoImportacoes.tsx — Histórico de importações (Etapa 6)
 *
 * As últimas 50 importações: quando, quem, quais arquivos, situação e o que
 * entrou na fila. Uma prévia ainda aberta pode ser retomada ("Continuar").
 */

import type { ImportacaoHistorico, StatusImportacao } from '../../lib/api.ts'
import { dataHoraBR, numeroBR } from '../../lib/formatar.ts'

/** Texto e cor de cada situação. */
const STATUS: Record<StatusImportacao, { texto: string; badge: string }> = {
  PREVIA: { texto: 'Prévia (não gravada)', badge: 'text-bg-warning' },
  CONFIRMADA: { texto: 'Confirmada', badge: 'text-bg-success' },
  CANCELADA: { texto: 'Cancelada', badge: 'text-bg-secondary' },
}

type Props = {
  itens: ImportacaoHistorico[] | undefined
  erro: string
  /** Retoma uma prévia aberta. */
  onContinuar: (id: number) => void
}

export default function HistoricoImportacoes({ itens, erro, onContinuar }: Props) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white">
        <h2 className="h6 mb-0">Histórico de importações</h2>
      </div>
      {erro && <div className="alert alert-danger m-3">{erro}</div>}
      {!itens && !erro && (
        <div className="text-secondary p-3">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> Carregando…
        </div>
      )}
      {itens && itens.length === 0 && <p className="text-secondary text-center py-4 mb-0">Nenhuma importação ainda.</p>}
      {itens && itens.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0 small">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Quem</th>
                <th scope="col">Arquivos</th>
                <th scope="col">Situação</th>
                <th scope="col" className="text-end">
                  Entraram na fila
                </th>
                <th scope="col" className="text-end">
                  Concluídas pelo espelhamento
                </th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => {
                const r = i.resumo
                return (
                  <tr key={i.id}>
                    <td className="text-nowrap">{dataHoraBR(i.criadoEm)}</td>
                    <td>{i.usuario?.nome ?? '—'}</td>
                    <td>
                      {i.arquivo}
                      {i.arquivoEspelhamento && <div className="text-secondary">{i.arquivoEspelhamento}</div>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS[i.status].badge}`}>{STATUS[i.status].texto}</span>
                    </td>
                    <td className="text-end">
                      {r?.resultado
                        ? numeroBR(r.resultado.revisoesCriadas)
                        : r?.revisoes && i.status === 'PREVIA'
                          ? `(${numeroBR(r.revisoes.elegiveis)} elegíveis)`
                          : '—'}
                    </td>
                    <td className="text-end">{r?.resultado ? numeroBR(r.resultado.revisoesConcluidas) : '—'}</td>
                    <td className="text-end">
                      {i.status === 'PREVIA' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => onContinuar(i.id)}
                        >
                          Continuar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
