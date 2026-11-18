/**
 * pages/Privacidade.tsx — Privacidade (LGPD), só Admin
 *
 * Atende os pedidos dos clientes ("titulares") previstos na LGPD:
 *  1. BUSCAR o cliente por CPF/CNPJ ou nome (a lista mostra o documento mascarado);
 *  2. VER tudo o que o sistema guarda sobre ele (cadastro, motos, revisões e
 *     ligações) e BAIXAR em arquivo, para responder ao pedido de acesso;
 *  3. ANONIMIZAR: apagar nome, CPF, celular e observações das ligações e tirar
 *     as revisões da fila. Não tem volta; pede para digitar ANONIMIZAR.
 *
 * Cada consulta e cada anonimização ficam na auditoria (aba Auditoria em Usuários).
 * Regras: apps/api/src/services/privacidade.ts. Procedimento: docs/lgpd.md.
 */

import { useState, type FormEvent } from 'react'
import BadgeSituacao from '../components/BadgeSituacao.tsx'
import PageHeader from '../components/PageHeader.tsx'
import {
  apiEnviar,
  apiGet,
  errosDosCampos,
  type DadosTitular,
  type ResultadoAnonimizacao,
  type TitularResumo,
} from '../lib/api.ts'
import { celularBR, dataBR, dataHoraBR, diaBR, kmBR, plural, ROTULO_RESULTADO } from '../lib/formatar.ts'

/** Mensagem de retorno de uma ação. */
type Aviso = { tipo: 'success' | 'danger'; texto: string }

/** Palavra que o Admin digita para confirmar a anonimização. */
const PALAVRA_CONFIRMACAO = 'ANONIMIZAR'

/** Baixa os dados do titular num arquivo .json (gerado no navegador, sem passar pelo servidor). */
function baixarJson(dados: DadosTitular) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `dados-titular-${dados.id}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function Privacidade() {
  // ---- Busca ----
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<TitularResumo[]>()
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState('')

  async function buscar(e: FormEvent) {
    e.preventDefault()
    setBuscando(true)
    setErroBusca('')
    try {
      setResultados(await apiGet<TitularResumo[]>(`/privacidade/titulares?busca=${encodeURIComponent(busca.trim())}`))
    } catch (erro) {
      setErroBusca(errosDosCampos(erro).busca?.[0] ?? (erro as Error).message)
    } finally {
      setBuscando(false)
    }
  }

  // ---- Titular aberto ----
  const [dados, setDados] = useState<DadosTitular>()
  const [aviso, setAviso] = useState<Aviso>()
  const [confirmacao, setConfirmacao] = useState('')
  const [anonimizando, setAnonimizando] = useState(false)

  async function abrir(id: number) {
    setAviso(undefined)
    setConfirmacao('')
    try {
      setDados(await apiGet<DadosTitular>(`/privacidade/titulares/${id}`))
    } catch (erro) {
      setAviso({ tipo: 'danger', texto: (erro as Error).message })
    }
  }

  async function anonimizar() {
    if (!dados) return
    setAnonimizando(true)
    try {
      const r = await apiEnviar<ResultadoAnonimizacao>('POST', `/privacidade/titulares/${dados.id}/anonimizar`, {
        confirmacao,
      })
      setAviso({
        tipo: 'success',
        texto: `Dados pessoais apagados. ${plural(r.revisoesEncerradas, 'revisão saiu', 'revisões saíram')} da fila; ${plural(r.observacoesApagadas, 'observação apagada', 'observações apagadas')}.`,
      })
      setConfirmacao('')
      await abrir(dados.id)
      setResultados((lista) => lista?.filter((t) => t.id !== dados.id))
    } catch (erro) {
      setAviso({ tipo: 'danger', texto: (erro as Error).message })
    } finally {
      setAnonimizando(false)
    }
  }

  return (
    <>
      <PageHeader title="Privacidade (LGPD)" subtitle="Pedidos dos clientes: ver os dados guardados ou apagá-los" />

      <div className="alert alert-light border small">
        <i className="bi bi-info-circle me-1" aria-hidden="true" />
        Use esta tela quando um cliente pedir para <strong>saber</strong> quais dados dele o sistema guarda ou para{' '}
        <strong>apagar</strong> esses dados. Confirme a identidade da pessoa antes. Cada consulta fica registrada na
        auditoria. Procedimento completo em <code>docs/lgpd.md</code>.
      </div>

      {/* Busca */}
      <form className="card border-0 shadow-sm mb-3" onSubmit={buscar}>
        <div className="card-body">
          <label htmlFor="p-busca" className="form-label small mb-1">
            CPF/CNPJ ou nome do cliente
          </label>
          <div className="input-group">
            <input
              id="p-busca"
              className={`form-control ${erroBusca ? 'is-invalid' : ''}`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: 000.000.000-01 ou MARIA"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={buscando || busca.trim().length < 3}>
              <i className="bi bi-search me-1" aria-hidden="true" />
              Buscar
            </button>
          </div>
          {erroBusca && <div className="invalid-feedback d-block">{erroBusca}</div>}
        </div>
      </form>

      {resultados && (
        <div className="card border-0 shadow-sm mb-3">
          {resultados.length === 0 ? (
            <p className="text-secondary text-center py-4 mb-0">Nenhum cliente encontrado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">CPF/CNPJ</th>
                    <th scope="col">Município</th>
                    <th scope="col" className="text-end">
                      Motos
                    </th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.nome}
                        {t.anonimizadoEm && <span className="badge text-bg-secondary ms-2">anonimizado</span>}
                      </td>
                      <td className="font-monospace small">{t.documento || '—'}</td>
                      <td>{t.municipio ?? '—'}</td>
                      <td className="text-end">{t.veiculos}</td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => abrir(t.id)}>
                          Ver dados
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aviso && (
        <div className={`alert alert-${aviso.tipo}`} role={aviso.tipo === 'danger' ? 'alert' : 'status'}>
          {aviso.texto}
        </div>
      )}

      {/* Dados do titular */}
      {dados && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white d-flex flex-wrap align-items-center gap-2">
            <h2 className="h6 mb-0 me-auto">Dados guardados de {dados.nome}</h2>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => baixarJson(dados)}>
              <i className="bi bi-download me-1" aria-hidden="true" />
              Baixar dados (arquivo)
            </button>
          </div>
          <div className="card-body">
            <dl className="row small mb-3">
              <dt className="col-sm-3">Nome</dt>
              <dd className="col-sm-9">{dados.nome}</dd>
              <dt className="col-sm-3">CPF/CNPJ</dt>
              <dd className="col-sm-9 font-monospace">{dados.cpfCnpj ?? '—'}</dd>
              <dt className="col-sm-3">Celular</dt>
              <dd className="col-sm-9">{celularBR(dados.celular) || '—'}</dd>
              <dt className="col-sm-3">Município</dt>
              <dd className="col-sm-9">{dados.municipio ?? '—'}</dd>
              <dt className="col-sm-3">No sistema desde</dt>
              <dd className="col-sm-9">{dataBR(dados.criadoEm)}</dd>
              {dados.anonimizadoEm && (
                <>
                  <dt className="col-sm-3">Anonimizado em</dt>
                  <dd className="col-sm-9">{dataHoraBR(dados.anonimizadoEm)}</dd>
                </>
              )}
            </dl>

            {dados.veiculos.map((v) => (
              <div key={v.chassi} className="border rounded p-2 mb-2">
                <div className="small fw-semibold mb-1">
                  {v.modelo} {v.cor && `· ${v.cor}`} · chassi <span className="font-monospace">{v.chassi}</span> ·
                  vendida em {dataBR(v.dataVenda)}
                </div>
                {v.revisoes.map((r) => (
                  <div key={r.id} className="small ms-2 mb-1">
                    Revisão de {kmBR(r.km)} <BadgeSituacao situacao={r.situacao} /> · {r.unidade?.sigla ?? '—'} ·{' '}
                    {r.operador?.nome ?? 'sem operadora'}
                    {r.tentativas.length > 0 && (
                      <ul className="mb-0">
                        {r.tentativas.map((t, i) => (
                          <li key={i}>
                            {dataHoraBR(t.criadoEm)} · {t.usuario?.nome ?? '—'} · {ROTULO_RESULTADO[t.resultado]}
                            {t.motivo && ` (${t.motivo.descricao})`}
                            {t.dataAgendada && ` · agendado para ${diaBR(t.dataAgendada)}`}
                            {t.observacoes && <span className="text-secondary"> · “{t.observacoes}”</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Anonimizar */}
          {!dados.anonimizadoEm && (
            <div className="card-footer bg-white">
              <h3 className="h6 text-danger">Apagar os dados pessoais (anonimizar)</h3>
              <p className="small text-secondary mb-2">
                Troca o nome por “CLIENTE ANONIMIZADO”, apaga CPF, celular e as observações das ligações e tira as
                revisões da fila. As ligações continuam contando no relatório de produção, sem dados do cliente.{' '}
                <strong>Não dá para desfazer.</strong>
              </p>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <label htmlFor="p-confirma" className="visually-hidden">
                  Digite {PALAVRA_CONFIRMACAO} para confirmar
                </label>
                <input
                  id="p-confirma"
                  className="form-control form-control-sm w-auto"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value.toUpperCase())}
                  placeholder={`Digite ${PALAVRA_CONFIRMACAO}`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={confirmacao !== PALAVRA_CONFIRMACAO || anonimizando}
                  onClick={anonimizar}
                >
                  <i className="bi bi-eraser me-1" aria-hidden="true" />
                  Anonimizar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
