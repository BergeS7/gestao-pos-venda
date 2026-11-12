/**
 * pages/Revisoes.tsx — Fila de revisões (Etapa 7)
 *
 * A "carteira" de clientes a ligar: substitui a aba "Revisões" da planilha.
 *
 * O que a página faz:
 *  - lista as revisões com filtros (busca, unidade, operadora, km, situação, mês de venda);
 *  - guarda os filtros e a página NA URL (?unidade=STI&pagina=2). Assim dá para
 *    recarregar, voltar no navegador ou mandar o link para alguém sem perder o filtro;
 *  - seleção em lote + "Atribuir a" uma operadora;
 *  - "Distribuir": divide as revisões sem operadora entre várias operadoras;
 *  - "Exportar": baixa o CSV da fila filtrada (abre no Excel).
 *
 * Por perfil (Etapa 9): a OPERADORA vê só a própria carteira (a API garante;
 * aqui o filtro de operadora some) e não vê seleção nem "Distribuir", que são
 * de Gestor e Admin. A Diretoria só consulta e exporta.
 *
 * Os componentes visuais ficam em components/revisoes/. Esta página cuida do
 * estado e das chamadas à API.
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/contexto.ts'
import PageHeader from '../components/PageHeader.tsx'
import Paginacao from '../components/Paginacao.tsx'
import FiltrosRevisoes from '../components/revisoes/FiltrosRevisoes.tsx'
import PainelDistribuir from '../components/revisoes/PainelDistribuir.tsx'
import TabelaRevisoes from '../components/revisoes/TabelaRevisoes.tsx'
import { CAMPOS_FILTRO, type FiltrosFila } from '../components/revisoes/tipos.ts'
import { useDebounce } from '../hooks/useDebounce.ts'
import { plural } from '../lib/formatar.ts'
import { pode } from '../lib/permissoes.ts'
import {
  apiEnviar,
  apiGet,
  montarQuery,
  type ListaRevisoes,
  type Operadora,
  type ResultadoAtribuir,
  type ResultadoDistribuir,
  type Unidade,
} from '../lib/api.ts'

/** Itens por página na tela. */
const POR_PAGINA = 20

/** Resultado da última busca, marcado com a "chave" (filtros) que o gerou. */
type Resultado = { chave: string; dados?: ListaRevisoes; erro?: string }

/** Mensagem de retorno de uma ação (sucesso ou erro). */
type Aviso = { tipo: 'success' | 'danger'; texto: string }

export default function Revisoes() {
  const { usuario } = useAuth()
  /** Gestor e Admin organizam a fila: seleção, "Atribuir a" e "Distribuir". */
  const gerir = pode(usuario, 'gerirFila')
  /** Operadora vê só a carteira dela: o filtro de operadora não se aplica. */
  const verTodas = pode(usuario, 'verTodasCarteiras')

  // -------------------------------------------------------------------------
  // Filtros (na URL)
  // -------------------------------------------------------------------------
  const [params, setParams] = useSearchParams()

  const filtros: FiltrosFila = useMemo(
    () => Object.fromEntries(CAMPOS_FILTRO.map((c) => [c, params.get(c) ?? ''])) as FiltrosFila,
    [params],
  )
  const pagina = Math.max(1, Number(params.get('pagina')) || 1)

  /** Altera um filtro na URL e volta para a página 1. */
  function mudarFiltro(campo: keyof FiltrosFila, valor: string) {
    setParams((atual) => {
      const novo = new URLSearchParams(atual)
      if (valor) novo.set(campo, valor)
      else novo.delete(campo)
      novo.delete('pagina')
      return novo
    })
  }

  function mudarPagina(nova: number) {
    setParams((atual) => {
      const novo = new URLSearchParams(atual)
      novo.set('pagina', String(nova))
      return novo
    })
  }

  // Busca: o campo atualiza a cada tecla, mas a URL (e a API) só depois de uma pausa
  const [busca, setBusca] = useState(filtros.busca)
  const buscaAtrasada = useDebounce(busca, 400)
  useEffect(() => {
    if (buscaAtrasada.trim() !== filtros.busca) mudarFiltro('busca', buscaAtrasada.trim())
    // mudarFiltro é recriada a cada render; a dependência real é só a busca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAtrasada])

  function limparFiltros() {
    setBusca('')
    setParams(new URLSearchParams())
  }

  // -------------------------------------------------------------------------
  // Catálogos para os filtros (carregados uma vez)
  // -------------------------------------------------------------------------
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [operadoras, setOperadoras] = useState<Operadora[]>([])

  useEffect(() => {
    Promise.all([apiGet<Unidade[]>('/unidades'), verTodas ? apiGet<Operadora[]>('/operadoras') : Promise.resolve([])])
      .then(([u, o]) => {
        setUnidades(u)
        setOperadoras(o)
      })
      .catch(() => {
        /* a lista principal já mostra o erro de conexão */
      })
  }, [verTodas])

  // -------------------------------------------------------------------------
  // Lista de revisões
  // -------------------------------------------------------------------------

  /** Query da API para os filtros atuais (sem paginação): usada também na exportação. */
  const queryFiltros = montarQuery({ ...filtros })
  /** Identifica a lista atual: filtros + página. */
  const chaveLista = montarQuery({ ...filtros, pagina, porPagina: POR_PAGINA })
  /** Contador que força recarregar a lista depois de uma ação (atribuir, distribuir). */
  const [recarga, setRecarga] = useState(0)

  const [resultado, setResultado] = useState<Resultado>()
  // "Carregando" é derivado: o resultado em tela ainda é de outra chave
  const carregando = resultado?.chave !== chaveLista

  useEffect(() => {
    // AbortController: se os filtros mudarem antes da resposta, cancela a
    // requisição antiga para ela não sobrescrever a nova
    const controle = new AbortController()
    apiGet<ListaRevisoes>(`/revisoes${chaveLista}`, controle.signal)
      .then((dados) => setResultado({ chave: chaveLista, dados }))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setResultado({ chave: chaveLista, erro: e.message })
      })
    return () => controle.abort()
  }, [chaveLista, recarga])

  const lista = resultado?.dados

  // -------------------------------------------------------------------------
  // Seleção (vale só para a lista atual: mudou o filtro ou a página, zera)
  // -------------------------------------------------------------------------
  const [selecao, setSelecao] = useState<{ chave: string; ids: Set<number> }>({ chave: '', ids: new Set() })
  const selecionados = selecao.chave === chaveLista ? selecao.ids : new Set<number>()

  function alternar(id: number) {
    const ids = new Set(selecionados)
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    setSelecao({ chave: chaveLista, ids })
  }

  function alternarTodos(marcar: boolean) {
    setSelecao({ chave: chaveLista, ids: new Set(marcar ? (lista?.itens ?? []).map((r) => r.id) : []) })
  }

  // -------------------------------------------------------------------------
  // Ações
  // -------------------------------------------------------------------------
  const [aviso, setAviso] = useState<Aviso>()
  const [enviando, setEnviando] = useState(false)
  /** Valor do seletor "Atribuir a": id da operadora, "null" (tirar) ou "" (nada escolhido). */
  const [destino, setDestino] = useState('')
  const [mostrarDistribuir, setMostrarDistribuir] = useState(false)

  const nomeOperadora = (id: number) => operadoras.find((o) => o.id === id)?.nome ?? `#${id}`

  /** Executa uma ação na API mostrando "enviando" e o aviso de resultado. */
  async function executar(acao: () => Promise<string>) {
    setEnviando(true)
    setAviso(undefined)
    try {
      setAviso({ tipo: 'success', texto: await acao() })
      setSelecao({ chave: '', ids: new Set() })
      setRecarga((n) => n + 1)
    } catch (e) {
      setAviso({ tipo: 'danger', texto: (e as Error).message })
    } finally {
      setEnviando(false)
    }
  }

  function atribuir() {
    const operadorId = destino === 'null' ? null : Number(destino)
    void executar(async () => {
      const r = await apiEnviar<ResultadoAtribuir>('PATCH', '/revisoes/atribuir', {
        ids: [...selecionados],
        operadorId,
      })
      return operadorId === null
        ? `${plural(r.atualizadas, 'revisão ficou', 'revisões ficaram')} sem operadora.`
        : `${plural(r.atualizadas, 'revisão atribuída', 'revisões atribuídas')} a ${nomeOperadora(operadorId)}.`
    })
  }

  function distribuir(operadorIds: number[]) {
    // Envia os filtros atuais, menos "operador": a API já distribui só as sem operadora
    const { operador: _ignorado, ...outros } = filtros
    const filtrosApi = Object.fromEntries(Object.entries(outros).filter(([, v]) => v !== ''))
    void executar(async () => {
      const r = await apiEnviar<ResultadoDistribuir>('POST', '/revisoes/distribuir', { operadorIds, filtros: filtrosApi })
      setMostrarDistribuir(false)
      if (r.distribuidas === 0) return 'Não há revisões sem operadora nesses filtros.'
      const partes = r.porOperadora.map((p) => `${nomeOperadora(p.operadorId)}: ${p.quantidade}`).join(' · ')
      return `${plural(r.distribuidas, 'revisão distribuída', 'revisões distribuídas')}. ${partes}`
    })
  }

  // -------------------------------------------------------------------------
  // Tela
  // -------------------------------------------------------------------------
  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <PageHeader
          title={verTodas ? 'Fila de revisões' : 'Minha carteira'}
          subtitle="Clientes a contatar por revisão (1.000, 6.000, 12.000 e 18.000 km)"
        />
        <div className="d-flex gap-2">
          {gerir && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => setMostrarDistribuir((v) => !v)}
              disabled={operadoras.length === 0}
            >
              <i className="bi bi-diagram-3 me-1" aria-hidden="true" /> Distribuir
            </button>
          )}
          {/* Link direto: o navegador baixa o arquivo gerado pela API */}
          <a className="btn btn-primary" href={`/api/revisoes/exportar${queryFiltros}`} download>
            <i className="bi bi-download me-1" aria-hidden="true" /> Exportar
          </a>
        </div>
      </div>

      {aviso && (
        <div className={`alert alert-${aviso.tipo} alert-dismissible`} role="status">
          {aviso.texto}
          <button type="button" className="btn-close" onClick={() => setAviso(undefined)} aria-label="Fechar aviso" />
        </div>
      )}

      {gerir && mostrarDistribuir && (
        <PainelDistribuir
          operadoras={operadoras}
          enviando={enviando}
          onDistribuir={distribuir}
          onFechar={() => setMostrarDistribuir(false)}
        />
      )}

      <FiltrosRevisoes
        filtros={filtros}
        busca={busca}
        unidades={unidades}
        operadoras={operadoras}
        onBusca={setBusca}
        onMudar={mudarFiltro}
        onLimpar={limparFiltros}
        mostrarOperadora={verTodas}
      />

      {/* Barra de ações em lote: aparece quando há revisões marcadas */}
      {gerir && selecionados.size > 0 && (
        <div className="barra-selecao card border-0 shadow-sm mb-3">
          <div className="card-body d-flex flex-wrap align-items-center gap-2 py-2">
            <strong>{plural(selecionados.size, 'selecionada', 'selecionadas')}</strong>
            <label htmlFor="atribuir-a" className="ms-md-3 small">
              Atribuir a
            </label>
            <select
              id="atribuir-a"
              className="form-select form-select-sm w-auto"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            >
              <option value="">Escolha…</option>
              {operadoras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
              <option value="null">— Tirar operadora —</option>
            </select>
            <button type="button" className="btn btn-sm btn-primary" disabled={!destino || enviando} onClick={atribuir}>
              {enviando && <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />}
              Atribuir
            </button>
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => setSelecao({ chave: '', ids: new Set() })}
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {resultado?.erro && !carregando ? (
            <div className="alert alert-danger mb-0">
              <strong>Não foi possível carregar a fila.</strong> {resultado.erro}
            </div>
          ) : !lista ? (
            <div className="text-center text-secondary py-5">
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> Carregando…
            </div>
          ) : (
            // Enquanto carrega uma nova página/filtro, mantém a lista anterior esmaecida
            <div className={carregando ? 'opacity-50' : undefined} aria-busy={carregando}>
              <TabelaRevisoes
                itens={lista.itens}
                selecionados={selecionados}
                onAlternar={gerir ? alternar : undefined}
                onAlternarTodos={gerir ? alternarTodos : undefined}
              />
              <div className="mt-3">
                <Paginacao
                  pagina={lista.pagina}
                  totalPaginas={lista.totalPaginas}
                  total={lista.total}
                  porPagina={lista.porPagina}
                  onMudar={mudarPagina}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
