/**
 * pages/Dashboard.tsx — Página inicial
 *
 * Hoje mostra:
 *  - os 4 indicadores principais do relatório mensal de produção, ainda sem
 *    valores (serão calculados pelo banco na Etapa 10);
 *  - o status da conexão com a API (GET /api/health).
 */

import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.tsx'
import { apiGet, type Health } from '../lib/api.ts'

/**
 * Estado da verificação da API. Cada situação tem seu próprio formato, assim
 * o TypeScript só deixa acessar `dados` quando o estado é 'ok' e `mensagem`
 * quando é 'erro' (técnica chamada "união discriminada").
 */
type Status =
  | { estado: 'carregando' }
  | { estado: 'ok'; dados: Health }
  | { estado: 'erro'; mensagem: string }

/** Indicadores do relatório de produção (ver docs/regras-de-negocio.md, seção 5). */
const indicadores = [
  { label: 'Total de clientes', icon: 'bi-people' },
  { label: 'Conseguiu falar', icon: 'bi-telephone-inbound' },
  { label: 'Agendados', icon: 'bi-calendar-check' },
  { label: 'Concluídos', icon: 'bi-check2-circle' },
]

export default function Dashboard() {
  const [status, setStatus] = useState<Status>({ estado: 'carregando' })

  // Ao abrir a página, consulta a API uma única vez (lista de dependências vazia: []).
  useEffect(() => {
    apiGet<Health>('/health')
      .then((dados) => setStatus({ estado: 'ok', dados }))
      .catch((e: Error) => setStatus({ estado: 'erro', mensagem: e.message }))
  }, [])

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Acompanhamento do pós-venda de revisões da oficina" />

      {/* Cards de indicadores: 2 por linha no celular (col-6), 4 em telas grandes (col-xl-3) */}
      <div className="row g-3 mb-4">
        {indicadores.map((kpi) => (
          <div key={kpi.label} className="col-6 col-xl-3">
            <div className="kpi-card card h-100">
              <div className="card-body d-flex align-items-start justify-content-between">
                <div>
                  <div className="kpi-label">{kpi.label}</div>
                  {/* "—" até existirem dados reais (Etapa 10) */}
                  <div className="kpi-value text-secondary">—</div>
                </div>
                <i className={`bi ${kpi.icon} kpi-icon`} aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status da conexão com a API */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h6 mb-3">Conexão com a API</h2>
          {status.estado === 'carregando' && (
            <span className="text-secondary">
              <span className="spinner-border spinner-border-sm me-2" /> Verificando…
            </span>
          )}
          {status.estado === 'ok' && (
            <>
              <span className="badge text-bg-success fs-6">
                <i className="bi bi-check-circle me-1" /> API ok
              </span>
              <div className="small text-secondary mt-2">
                Última resposta: {new Date(status.dados.timestamp).toLocaleString('pt-BR')}
              </div>
            </>
          )}
          {status.estado === 'erro' && (
            <div className="alert alert-danger mb-0">
              <strong>API fora do ar.</strong> Rode <code>npm run dev</code> em <code>apps/api</code>.
              <div className="small mt-1">{status.mensagem}</div>
            </div>
          )}
        </div>
      </div>

      <p className="small text-secondary mt-3 mb-0">
        Os indicadores serão calculados a partir do banco na Etapa 10.
      </p>
    </>
  )
}
