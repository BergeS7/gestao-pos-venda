/**
 * pages/Importacoes.tsx — Importação dos relatórios do Cloud (Etapa 6, Gestor e Admin)
 *
 * Substitui o cruzamento feito à mão no Excel. Quatro passos:
 *   1. ARQUIVOS: a lista de revisões e/ou o espelhamento de OS (.xlsx ou .csv);
 *   2. VALIDAÇÃO: quantas linhas foram lidas, recusadas (e por quê) e repetidas;
 *   3. CRUZAMENTO: quem já tem OS (sai), quem já está na fila e quem é elegível;
 *      revisões abertas que o espelhamento mostra como feitas (conclusão automática);
 *   4. CONFIRMAÇÃO: só aqui algo é gravado. As revisões entram SEM operadora;
 *      depois o Gestor usa "Distribuir" na fila.
 *
 * Abaixo, o histórico das importações. Uma prévia aberta pode ser retomada.
 * Regras: apps/api/src/services/importacao.ts e docs/regras-de-negocio.md.
 * Arquivos fictícios para testar: db/seed/ (com os números esperados no README de lá).
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.tsx'
import HistoricoImportacoes from '../components/importacao/HistoricoImportacoes.tsx'
import Numeros from '../components/importacao/Numeros.tsx'
import { TabelaInvalidas, TabelaLinhas } from '../components/importacao/TabelaImportacao.tsx'
import {
  apiEnviar,
  apiEnviarArquivos,
  apiGet,
  type ImportacaoHistorico,
  type PreviaImportacao,
  type ResultadoImportacao,
} from '../lib/api.ts'
import { kmBR, numeroBR, plural } from '../lib/formatar.ts'

/** Os quatro passos, na ordem. */
const PASSOS = ['Arquivos', 'Validação', 'Cruzamento', 'Confirmação'] as const

/** Tipos de arquivo aceitos nos campos de upload. */
const ACEITOS = '.xlsx,.csv'

export default function Importacoes() {
  const [passo, setPasso] = useState(0)

  // ---- Passo 1: arquivos ----
  const [arquivoRevisoes, setArquivoRevisoes] = useState<File | null>(null)
  const [arquivoEspelho, setArquivoEspelho] = useState<File | null>(null)
  const [exigirTipoOs, setExigirTipoOs] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')

  // ---- Prévia e resultado ----
  const [previa, setPrevia] = useState<PreviaImportacao>()
  const [gravando, setGravando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImportacao>()

  // ---- Histórico ----
  const [historico, setHistorico] = useState<ImportacaoHistorico[]>()
  const [erroHistorico, setErroHistorico] = useState('')
  const [recarga, setRecarga] = useState(0)
  useEffect(() => {
    apiGet<ImportacaoHistorico[]>('/importacoes')
      .then((h) => {
        setHistorico(h)
        setErroHistorico('')
      })
      .catch((e: Error) => setErroHistorico(e.message))
  }, [recarga])

  /** Volta ao começo, sem arquivos nem prévia. */
  function recomecar() {
    setPasso(0)
    setPrevia(undefined)
    setResultado(undefined)
    setArquivoRevisoes(null)
    setArquivoEspelho(null)
    setErro('')
  }

  async function lerArquivos(e: FormEvent) {
    e.preventDefault()
    setLendo(true)
    setErro('')
    setResultado(undefined)
    try {
      const p = await apiEnviarArquivos<PreviaImportacao>(
        '/importacoes/previa',
        { revisoes: arquivoRevisoes, espelhamento: arquivoEspelho },
        { exigirTipoOs: String(exigirTipoOs) },
      )
      setPrevia(p)
      setPasso(1)
      setRecarga((n) => n + 1)
    } catch (erro) {
      setErro((erro as Error).message)
    } finally {
      setLendo(false)
    }
  }

  async function continuar(id: number) {
    setErro('')
    setResultado(undefined)
    try {
      setPrevia(await apiGet<PreviaImportacao>(`/importacoes/${id}`))
      setPasso(1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (erro) {
      setErro((erro as Error).message)
    }
  }

  async function confirmar() {
    if (!previa) return
    setGravando(true)
    setErro('')
    try {
      const r = await apiEnviar<{ resultado: ResultadoImportacao }>('POST', `/importacoes/${previa.id}/confirmar`)
      setResultado(r.resultado)
      setRecarga((n) => n + 1)
    } catch (erro) {
      setErro((erro as Error).message)
    } finally {
      setGravando(false)
    }
  }

  async function cancelar() {
    if (!previa) return
    try {
      await apiEnviar('POST', `/importacoes/${previa.id}/cancelar`)
      recomecar()
      setRecarga((n) => n + 1)
    } catch (erro) {
      setErro((erro as Error).message)
    }
  }

  const rev = previa?.resumo.revisoes
  const esp = previa?.resumo.espelhamento
  const listas = previa?.listas

  return (
    <>
      <PageHeader title="Importações" subtitle="Lista de revisões e espelhamento de OS exportados do Cloud" />

      {/* Indicador de passos */}
      <ol className="passos-importacao list-unstyled d-flex flex-wrap gap-2 mb-3" aria-label="Passos da importação">
        {PASSOS.map((nome, i) => (
          <li
            key={nome}
            className={`badge rounded-pill ${i === passo ? 'text-bg-primary' : i < passo ? 'text-bg-success' : 'text-bg-light border'}`}
            aria-current={i === passo ? 'step' : undefined}
          >
            {i + 1}. {nome}
          </li>
        ))}
      </ol>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {/* ---------- Passo 1: arquivos ---------- */}
      {passo === 0 && (
        <form className="card border-0 shadow-sm mb-4" onSubmit={lerArquivos}>
          <div className="card-body">
            <p className="small text-secondary">
              Envie os relatórios exportados do Cloud, do jeito que saem (.xlsx ou .csv). Pode mandar os dois juntos (o
              normal no mês) ou só o espelhamento, para marcar como concluídas as revisões que já foram feitas.{' '}
              <strong>Nada é gravado neste passo.</strong>
            </p>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="i-revisoes" className="form-label small mb-1">
                  Lista de revisões <span className="text-secondary">(“LISTA DE REVISOES - OBTER KM”)</span>
                </label>
                <input
                  id="i-revisoes"
                  type="file"
                  accept={ACEITOS}
                  className="form-control"
                  onChange={(e) => setArquivoRevisoes(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="i-espelho" className="form-label small mb-1">
                  Espelhamento de OS <span className="text-secondary">(“ESPELHAMENTO”)</span>
                </label>
                <input
                  id="i-espelho"
                  type="file"
                  accept={ACEITOS}
                  className="form-control"
                  onChange={(e) => setArquivoEspelho(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="form-check mt-3">
              <input
                id="i-tipo"
                type="checkbox"
                className="form-check-input"
                checked={exigirTipoOs}
                onChange={(e) => setExigirTipoOs(e.target.checked)}
              />
              <label htmlFor="i-tipo" className="form-check-label small">
                Só tirar da lista quando o <strong>tipo da OS</strong> corresponder ao km (ex.: OS de 1ª revisão não
                tira a revisão de 6.000 km).{' '}
                <span className="text-secondary">Desmarcado = qualquer OS do chassi tira, como na planilha hoje.</span>
              </label>
            </div>
          </div>
          <div className="card-footer bg-white text-end">
            <button type="submit" className="btn btn-primary" disabled={lendo || (!arquivoRevisoes && !arquivoEspelho)}>
              {lendo ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Lendo arquivos…
                </>
              ) : (
                <>
                  Ler arquivos <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ---------- Passo 2: validação ---------- */}
      {passo === 1 && previa && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            {rev && (
              <>
                <h2 className="h6">Lista de revisões</h2>
                <Numeros
                  itens={[
                    { rotulo: 'Linhas lidas', valor: rev.lidas },
                    { rotulo: 'Válidas', valor: rev.validas, cor: 'success' },
                    {
                      rotulo: 'Recusadas',
                      valor: rev.invalidas,
                      cor: rev.invalidas ? 'danger' : undefined,
                      dica: 'faltam dados ou estão errados',
                    },
                    { rotulo: 'Repetidas no arquivo', valor: rev.duplicadas, dica: 'mesmo chassi e km' },
                    { rotulo: 'Já estão na fila', valor: rev.jaNaFila, dica: 'importadas antes' },
                  ]}
                />
                <TabelaInvalidas linhas={listas?.invalidas ?? []} total={rev.invalidas} />
              </>
            )}
            {esp && (
              <>
                <h2 className="h6 mt-4">Espelhamento de OS</h2>
                <Numeros
                  itens={[
                    { rotulo: 'Linhas lidas', valor: esp.lidas },
                    { rotulo: 'OS válidas', valor: esp.validas, cor: 'success' },
                    { rotulo: 'Recusadas', valor: esp.invalidas, cor: esp.invalidas ? 'danger' : undefined },
                    { rotulo: 'OS novas', valor: esp.novas, dica: 'ainda não estavam no sistema' },
                  ]}
                />
                <TabelaInvalidas linhas={listas?.osInvalidas ?? []} total={esp.invalidas} />
              </>
            )}
          </div>
          <div className="card-footer bg-white d-flex justify-content-between">
            <button type="button" className="btn btn-outline-secondary" onClick={cancelar}>
              Cancelar importação
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setPasso(2)}>
              Ver cruzamento <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ---------- Passo 3: cruzamento ---------- */}
      {passo === 2 && previa && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <p className="small text-secondary">
              Cruzamento por <strong>chassi</strong>
              {previa.resumo.exigirTipoOs
                ? ', exigindo que o tipo da OS corresponda ao km.'
                : ': qualquer OS do chassi no espelhamento tira a revisão da lista.'}{' '}
              OS de importações anteriores só contam quando o tipo corresponde ao km.
            </p>
            {rev && (
              <>
                <Numeros
                  itens={[
                    { rotulo: 'Já fizeram (têm OS)', valor: rev.comOs, dica: 'saem da lista' },
                    ...(rev.anonimizados
                      ? [{ rotulo: 'Anonimizados (LGPD)', valor: rev.anonimizados, dica: 'não voltam' }]
                      : []),
                    {
                      rotulo: 'Elegíveis',
                      valor: rev.elegiveis,
                      cor: 'success' as const,
                      dica: 'vão para a fila',
                    },
                    {
                      rotulo: 'Sem unidade',
                      valor: rev.elegiveisSemUnidade,
                      cor: rev.elegiveisSemUnidade ? ('warning' as const) : undefined,
                      dica: 'município fora da tabela',
                    },
                  ]}
                />
                <h2 className="h6">Elegíveis (vão para a fila)</h2>
                <TabelaLinhas
                  linhas={listas?.elegiveis ?? []}
                  total={rev.elegiveis}
                  vazio="Nenhuma revisão elegível."
                />
                {rev.comOs > 0 && (
                  <>
                    <h2 className="h6 mt-4">Saem da lista por já terem OS</h2>
                    <TabelaLinhas linhas={listas?.comOs ?? []} total={rev.comOs} comTipoOs vazio="" />
                  </>
                )}
              </>
            )}
            {esp && (
              <>
                <h2 className="h6 mt-4">Conclusão automática</h2>
                {esp.conclusoes === 0 ? (
                  <p className="small text-secondary mb-0">
                    Nenhuma revisão aberta no sistema tem OS do mesmo km neste espelhamento.
                  </p>
                ) : (
                  <>
                    <p className="small">
                      {plural(esp.conclusoes, 'revisão aberta será marcada', 'revisões abertas serão marcadas')} como{' '}
                      <strong>concluída</strong>: o espelhamento mostra OS do mesmo km.
                    </p>
                    <ul className="small mb-0">
                      {(listas?.conclusoes ?? []).map((c) => (
                        <li key={c.id}>
                          <Link to={`/revisoes/${c.id}`} className="font-monospace">
                            {c.chassi}
                          </Link>{' '}
                          · {kmBR(c.km)} · {c.tipoOs}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
          <div className="card-footer bg-white d-flex justify-content-between">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setPasso(1)}>
              <i className="bi bi-arrow-left me-1" aria-hidden="true" /> Voltar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setPasso(3)}>
              Revisar e confirmar <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ---------- Passo 4: confirmação ---------- */}
      {passo === 3 && previa && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            {resultado ? (
              <div className="alert alert-success mb-0" role="status">
                <h2 className="h6">Importação gravada</h2>
                <ul className="mb-2">
                  <li>
                    {plural(resultado.revisoesCriadas, 'revisão entrou', 'revisões entraram')} na fila, sem operadora (
                    {plural(resultado.clientesNovos, 'cliente novo', 'clientes novos')},{' '}
                    {plural(resultado.veiculosNovos, 'moto nova', 'motos novas')})
                  </li>
                  <li>{plural(resultado.osGravadas, 'ordem de serviço gravada', 'ordens de serviço gravadas')}</li>
                  <li>
                    {plural(resultado.revisoesConcluidas, 'revisão concluída', 'revisões concluídas')} pelo espelhamento
                  </li>
                </ul>
                <div className="d-flex flex-wrap gap-2">
                  <Link to="/revisoes?operador=sem" className="btn btn-sm btn-success">
                    <i className="bi bi-diagram-3 me-1" aria-hidden="true" />
                    Distribuir na fila
                  </Link>
                  <button type="button" className="btn btn-sm btn-outline-success" onClick={recomecar}>
                    Nova importação
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="h6">O que vai ser gravado</h2>
                <ul>
                  {rev && (
                    <li>
                      <strong>{numeroBR(rev.elegiveis)}</strong>{' '}
                      {rev.elegiveis === 1 ? 'revisão entra' : 'revisões entram'} na fila como “Pendente”,{' '}
                      <strong>sem operadora</strong>. Depois use “Distribuir” na fila.
                    </li>
                  )}
                  {esp && (
                    <>
                      <li>{plural(esp.novas, 'ordem de serviço nova', 'ordens de serviço novas')} ficam guardadas.</li>
                      <li>{plural(esp.conclusoes, 'revisão é marcada', 'revisões são marcadas')} como concluída.</li>
                    </>
                  )}
                </ul>
                <p className="small text-secondary mb-0">
                  Os números podem mudar um pouco se alguém importou ou concluiu algo desde a prévia: a confirmação
                  confere tudo de novo com o que está no sistema agora.
                </p>
              </>
            )}
          </div>
          {!resultado && (
            <div className="card-footer bg-white d-flex flex-wrap gap-2 justify-content-between">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setPasso(2)}>
                <i className="bi bi-arrow-left me-1" aria-hidden="true" /> Voltar
              </button>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-danger" onClick={cancelar} disabled={gravando}>
                  Cancelar importação
                </button>
                <button type="button" className="btn btn-success" onClick={confirmar} disabled={gravando}>
                  {gravando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                      Gravando…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2 me-1" aria-hidden="true" />
                      Confirmar importação
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <HistoricoImportacoes itens={historico} erro={erroHistorico} onContinuar={continuar} />
    </>
  )
}
