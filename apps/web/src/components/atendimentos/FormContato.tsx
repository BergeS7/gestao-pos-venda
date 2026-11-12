/**
 * components/atendimentos/FormContato.tsx — Formulário "Registrar contato"
 *
 * As mesmas perguntas da planilha, agora com listas fixas e validação:
 *   Conseguiu falar? → Agendou? → Motivo / Data agendada / Próximo contato → Observações
 *
 * Os campos aparecem conforme as respostas:
 *  - Agendou = Sim         → pede a data agendada (motivo não se aplica);
 *  - Agendou = Não/Retornar → pede o motivo;
 *  - se a revisão volta para a fila (Retornar, ou motivo de retorno) → próximo contato obrigatório;
 *  - motivo que encerra (ex.: "Se desfez da moto") → sem próximo contato.
 *
 * A validação aqui é só para ajudar quem preenche. A API valida tudo de novo
 * (apps/api/src/schemas/atendimentos.ts) e os erros dela aparecem nos campos.
 */

import { useState, type FormEvent } from 'react'
import type { Motivo, NovaTentativa, ResultadoContato } from '../../lib/api.ts'
import { diaISO } from '../../lib/formatar.ts'

type Props = {
  motivos: Motivo[]
  /** Versão da revisão mostrada na tela (proteção contra sobrescrita). */
  versao: number
  enviando: boolean
  /** Erros por campo devolvidos pela API (400). */
  errosApi: Record<string, string[]>
  onEnviar: (dados: NovaTentativa) => void
}

/** Atalhos para o próximo contato: rótulo e dias a partir de hoje. */
const ATALHOS_DIAS = [
  { rotulo: 'Amanhã', dias: 1 },
  { rotulo: '1 semana', dias: 7 },
  { rotulo: '15 dias', dias: 15 },
  { rotulo: '1 mês', dias: 30 },
]

export default function FormContato({ motivos, versao, enviando, errosApi, onEnviar }: Props) {
  // Respostas do formulário. '' = ainda não respondido.
  const [falou, setFalou] = useState<'' | 'sim' | 'nao'>('')
  const [resultado, setResultado] = useState<'' | ResultadoContato>('')
  const [motivoId, setMotivoId] = useState('')
  const [dataAgendada, setDataAgendada] = useState('')
  const [proximoContato, setProximoContato] = useState('')
  const [observacoes, setObservacoes] = useState('')
  /** Só mostra os erros locais depois da primeira tentativa de enviar. */
  const [tentouEnviar, setTentouEnviar] = useState(false)

  // ---- Regras de exibição (espelham services/atendimentos.ts da API) ----
  const motivo = motivos.find((m) => String(m.id) === motivoId)
  const agendou = resultado === 'SIM'
  const pedeMotivo = resultado === 'NAO' || resultado === 'RETORNAR'
  const voltaParaFila = resultado === 'RETORNAR' || motivo?.acao === 'RETORNAR'
  const mostraProximo = pedeMotivo && motivo?.acao !== 'ENCERRAR'

  // ---- Validação local ----
  const erros: Record<string, string> = {}
  if (!falou) erros.falou = 'Responda se conseguiu falar'
  if (!resultado) erros.resultado = 'Responda se agendou'
  if (agendou && falou === 'nao') erros.resultado = 'Para agendar, é preciso ter falado com o cliente'
  if (agendou && !dataAgendada) erros.dataAgendada = 'Informe a data agendada'
  if (pedeMotivo && !motivoId) erros.motivoId = 'Escolha o motivo'
  if (voltaParaFila && !proximoContato) erros.proximoContato = 'Informe quando ligar de novo'

  /** Mensagem do campo: a local (depois de tentar enviar) ou a que veio da API. */
  const erroDe = (campo: string, campoApi = campo) => (tentouEnviar ? erros[campo] : undefined) ?? errosApi[campoApi]?.[0]

  function mudarFalou(valor: 'sim' | 'nao') {
    setFalou(valor)
    // Não falou → não pode ter agendado
    if (valor === 'nao' && resultado === 'SIM') setResultado('')
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setTentouEnviar(true)
    if (Object.keys(erros).length > 0) return
    onEnviar({
      versao,
      conseguiuFalar: falou === 'sim',
      resultado: resultado as ResultadoContato,
      // Só envia o que se aplica à resposta escolhida
      motivoId: pedeMotivo ? Number(motivoId) : null,
      dataAgendada: agendou ? dataAgendada : undefined,
      proximoContato: mostraProximo && proximoContato ? proximoContato : undefined,
      observacoes: observacoes.trim() || undefined,
    })
  }

  const hoje = diaISO()
  const limite = diaISO(365)

  return (
    <form className="card border-0 shadow-sm" onSubmit={enviar} noValidate>
      <div className="card-body">
        <h2 className="h6 mb-3">
          <i className="bi bi-telephone-plus me-2 text-primary" aria-hidden="true" />
          Registrar contato
        </h2>

        {/* Conseguiu falar? */}
        <fieldset className="mb-3">
          <legend className="form-label small fw-semibold mb-1">Conseguiu falar?</legend>
          <div className="btn-group" role="group">
            {(['sim', 'nao'] as const).map((v) => (
              <label key={v} className={`btn btn-outline-secondary ${falou === v ? 'active' : ''}`}>
                <input
                  type="radio"
                  className="btn-check"
                  name="falou"
                  checked={falou === v}
                  onChange={() => mudarFalou(v)}
                />
                {v === 'sim' ? 'Sim' : 'Não'}
              </label>
            ))}
          </div>
          {erroDe('falou') && <div className="small text-danger mt-1">{erroDe('falou')}</div>}
        </fieldset>

        {/* Agendou? */}
        <fieldset className="mb-3">
          <legend className="form-label small fw-semibold mb-1">Agendou?</legend>
          <div className="btn-group flex-wrap" role="group">
            {(
              [
                ['SIM', 'Sim'],
                ['NAO', 'Não'],
                ['RETORNAR', 'Retornar'],
              ] as const
            ).map(([v, rotulo]) => (
              <label
                key={v}
                className={`btn btn-outline-secondary ${resultado === v ? 'active' : ''} ${v === 'SIM' && falou === 'nao' ? 'disabled' : ''}`}
              >
                <input
                  type="radio"
                  className="btn-check"
                  name="resultado"
                  checked={resultado === v}
                  disabled={v === 'SIM' && falou === 'nao'}
                  onChange={() => setResultado(v)}
                />
                {rotulo}
              </label>
            ))}
          </div>
          {erroDe('resultado') && <div className="small text-danger mt-1">{erroDe('resultado')}</div>}
        </fieldset>

        <div className="row g-3">
          {agendou && (
            <div className="col-sm-6">
              <label htmlFor="c-data-agendada" className="form-label small fw-semibold mb-1">
                Data agendada
              </label>
              <input
                id="c-data-agendada"
                type="date"
                className={`form-control ${erroDe('dataAgendada') ? 'is-invalid' : ''}`}
                min={hoje}
                max={limite}
                value={dataAgendada}
                onChange={(e) => setDataAgendada(e.target.value)}
              />
              <div className="invalid-feedback">{erroDe('dataAgendada')}</div>
            </div>
          )}

          {pedeMotivo && (
            <div className="col-sm-6">
              <label htmlFor="c-motivo" className="form-label small fw-semibold mb-1">
                Motivo
              </label>
              <select
                id="c-motivo"
                className={`form-select ${erroDe('motivoId') ? 'is-invalid' : ''}`}
                value={motivoId}
                onChange={(e) => setMotivoId(e.target.value)}
              >
                <option value="">Escolha…</option>
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.descricao}
                  </option>
                ))}
              </select>
              <div className="invalid-feedback">{erroDe('motivoId')}</div>
              {motivo?.acao === 'ENCERRAR' && (
                <div className="form-text">Este motivo encerra o cliente nesta revisão (sai da fila de ligações).</div>
              )}
              {motivo?.acao === 'BUSCAR_CONTATO' && (
                <div className="form-text">A revisão vai para "Buscar contato": procurar outro telefone.</div>
              )}
            </div>
          )}

          {mostraProximo && (
            <div className="col-sm-6">
              <label htmlFor="c-proximo" className="form-label small fw-semibold mb-1">
                Próximo contato {!voltaParaFila && <span className="text-secondary fw-normal">(opcional)</span>}
              </label>
              <input
                id="c-proximo"
                type="date"
                className={`form-control ${erroDe('proximoContato') ? 'is-invalid' : ''}`}
                min={hoje}
                max={limite}
                value={proximoContato}
                onChange={(e) => setProximoContato(e.target.value)}
              />
              <div className="invalid-feedback">{erroDe('proximoContato')}</div>
              <div className="d-flex flex-wrap gap-1 mt-1">
                {ATALHOS_DIAS.map((a) => (
                  <button
                    key={a.dias}
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setProximoContato(diaISO(a.dias))}
                  >
                    {a.rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="col-12">
            <label htmlFor="c-obs" className="form-label small fw-semibold mb-1">
              Observações <span className="text-secondary fw-normal">(opcional)</span>
            </label>
            <textarea
              id="c-obs"
              className={`form-control ${errosApi.observacoes ? 'is-invalid' : ''}`}
              rows={2}
              maxLength={1000}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
            <div className="invalid-feedback">{errosApi.observacoes?.[0]}</div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-3" disabled={enviando}>
          {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Salvar contato
        </button>
      </div>
    </form>
  )
}
