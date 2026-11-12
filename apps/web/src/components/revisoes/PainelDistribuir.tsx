/**
 * components/revisoes/PainelDistribuir.tsx — Distribuir a fila entre operadoras
 *
 * Reproduz o que hoje é feito na planilha: dividir a lista entre as operadoras.
 * Pega as revisões SEM operadora (e não concluídas) que atendem aos filtros
 * atuais e divide em partes iguais entre as operadoras marcadas.
 * A divisão acontece na API (POST /api/revisoes/distribuir).
 */

import { useState } from 'react'
import type { Operadora } from '../../lib/api.ts'

type Props = {
  operadoras: Operadora[]
  /** true enquanto a distribuição está sendo enviada. */
  enviando: boolean
  /** Chamado com os ids das operadoras escolhidas. */
  onDistribuir: (operadorIds: number[]) => void
  onFechar: () => void
}

export default function PainelDistribuir({ operadoras, enviando, onDistribuir, onFechar }: Props) {
  // Começa com todas as operadoras marcadas (o caso mais comum)
  const [marcadas, setMarcadas] = useState<Set<number>>(() => new Set(operadoras.map((o) => o.id)))

  function alternar(id: number) {
    setMarcadas((atual) => {
      const nova = new Set(atual)
      if (nova.has(id)) nova.delete(id)
      else nova.add(id)
      return nova
    })
  }

  return (
    <div className="card border-primary mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h2 className="h6 mb-0">
            <i className="bi bi-diagram-3 me-2 text-primary" aria-hidden="true" />
            Distribuir entre operadoras
          </h2>
          <button type="button" className="btn-close" onClick={onFechar} aria-label="Fechar" />
        </div>
        <p className="small text-secondary">
          As revisões <strong>sem operadora</strong> (e não concluídas) que aparecem com os filtros atuais serão
          divididas em partes iguais entre as operadoras marcadas.
        </p>

        <div className="d-flex flex-wrap gap-3 mb-3">
          {operadoras.map((o) => (
            <div key={o.id} className="form-check">
              <input
                id={`dist-${o.id}`}
                type="checkbox"
                className="form-check-input"
                checked={marcadas.has(o.id)}
                onChange={() => alternar(o.id)}
              />
              <label htmlFor={`dist-${o.id}`} className="form-check-label">
                {o.nome}
                {o.unidade && <span className="text-secondary small"> · {o.unidade.sigla}</span>}
              </label>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={marcadas.size === 0 || enviando}
          onClick={() => onDistribuir([...marcadas])}
        >
          {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Distribuir
        </button>
      </div>
    </div>
  )
}
