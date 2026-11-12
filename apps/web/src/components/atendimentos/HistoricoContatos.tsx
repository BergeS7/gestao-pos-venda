/**
 * components/atendimentos/HistoricoContatos.tsx — Linha do tempo das ligações
 *
 * Mostra todas as tentativas de contato da revisão, da mais nova para a mais
 * antiga. Substitui as linhas repetidas da planilha: aqui cada ligação é um
 * item do histórico da mesma revisão.
 */

import type { Tentativa } from '../../lib/api.ts'
import { dataHoraBR, diaBR, ROTULO_RESULTADO } from '../../lib/formatar.ts'

/** Ícone e cor de cada resposta "Agendou?". */
const ESTILO_RESULTADO = {
  SIM: { icone: 'bi-calendar-check', cor: 'text-success' },
  NAO: { icone: 'bi-x-circle', cor: 'text-danger' },
  RETORNAR: { icone: 'bi-arrow-repeat', cor: 'text-warning' },
} as const

export default function HistoricoContatos({ tentativas }: { tentativas: Tentativa[] }) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <h2 className="h6 mb-3">
          <i className="bi bi-clock-history me-2 text-primary" aria-hidden="true" />
          Histórico de contatos
          <span className="badge text-bg-light border ms-2">{tentativas.length}</span>
        </h2>

        {tentativas.length === 0 ? (
          <p className="text-secondary small mb-0">Nenhum contato registrado ainda.</p>
        ) : (
          <ol className="linha-tempo list-unstyled mb-0">
            {tentativas.map((t) => {
              const estilo = ESTILO_RESULTADO[t.resultado]
              return (
                <li key={t.id} className="linha-tempo-item">
                  <i className={`bi ${estilo.icone} ${estilo.cor} linha-tempo-icone`} aria-hidden="true" />
                  <div className="d-flex flex-wrap justify-content-between gap-1">
                    <strong>{ROTULO_RESULTADO[t.resultado]}</strong>
                    <span className="small text-secondary">{dataHoraBR(t.criadoEm)}</span>
                  </div>
                  <div className="small">
                    {t.conseguiuFalar ? 'Falou com o cliente' : 'Não conseguiu falar'}
                    {t.motivo && <> · {t.motivo.descricao}</>}
                  </div>
                  {(t.dataAgendada || t.proximoContato) && (
                    <div className="small">
                      {t.dataAgendada && <>Agendado para <strong>{diaBR(t.dataAgendada)}</strong></>}
                      {t.proximoContato && <>Ligar de novo em <strong>{diaBR(t.proximoContato)}</strong></>}
                    </div>
                  )}
                  {t.observacoes && <div className="small fst-italic text-secondary mt-1">“{t.observacoes}”</div>}
                  {t.usuario && <div className="small text-secondary">por {t.usuario.nome}</div>}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
