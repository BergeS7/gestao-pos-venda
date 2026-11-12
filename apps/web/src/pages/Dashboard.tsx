/**
 * pages/Dashboard.tsx — Relatório mensal de produção (Etapa 10)
 *
 * Substitui a planilha "Produção equipe pós venda oficina - <mês>" feita à
 * mão. Os números vêm de GET /api/relatorios/producao; as regras do cálculo
 * estão em apps/api/src/services/relatorios.ts e em
 * docs/regras-de-negocio.md (seção 5.1).
 *
 * O que a página mostra:
 *  - filtros de mês, unidade e operadora (guardados NA URL, como na fila:
 *    dá para recarregar ou mandar o link sem perder o filtro);
 *  - 4 cards: total, falou, agendados e concluídos, com as taxas;
 *  - gráfico do funil por operadora e gráfico das causas de "não agendou";
 *  - tabelas: operadora × unidade, por unidade, ranking por operadora e causas;
 *  - "Exportar Excel": baixa o mesmo relatório em .xlsx.
 *
 * Por perfil: a OPERADORA vê só os próprios números (a API garante; aqui o
 * filtro de operadora e as colunas de operadora somem).
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/contexto.ts'
import PageHeader from '../components/PageHeader.tsx'
import CardsIndicadores from '../components/dashboard/CardsIndicadores.tsx'
import GraficoCausas from '../components/dashboard/GraficoCausas.tsx'
import GraficoProducao from '../components/dashboard/GraficoProducao.tsx'
import TabelaCausas from '../components/dashboard/TabelaCausas.tsx'
import TabelaContagens from '../components/dashboard/TabelaContagens.tsx'
import { apiGet, montarQuery, type Operadora, type Relatorio, type Unidade } from '../lib/api.ts'
import { diaISO, mesPorExtenso } from '../lib/formatar.ts'
import { pode } from '../lib/permissoes.ts'

/** Quantos meses aparecem na lista de meses (o atual e os anteriores). */
const MESES_NA_LISTA = 24

/** Meses para escolher: ["2026-11", "2026-10", ...], do mais novo para o mais antigo. */
function ultimosMeses(atual: string): string[] {
  const [ano, mes] = atual.split('-').map(Number)
  return Array.from({ length: MESES_NA_LISTA }, (_, i) => {
    const d = new Date(Date.UTC(ano, mes - 1 - i, 1))
    return d.toISOString().slice(0, 7)
  })
}

/** Resultado da consulta, marcado com a chave (filtros) a que pertence. */
type Resultado = { chave: string } & ({ relatorio: Relatorio } | { erro: string })

export default function Dashboard() {
  const { usuario } = useAuth()
  const verTodas = pode(usuario, 'verTodasCarteiras')

  // -------------------------------------------------------------------------
  // Filtros (na URL). Sem ?mes, vale o mês atual no horário do Maranhão.
  // -------------------------------------------------------------------------
  const mesAtual = diaISO().slice(0, 7)
  const meses = useMemo(() => ultimosMeses(mesAtual), [mesAtual])
  const [params, setParams] = useSearchParams()
  const mes = params.get('mes') || mesAtual
  const unidade = params.get('unidade') ?? ''
  const operador = verTodas ? (params.get('operador') ?? '') : ''

  /** Muda um filtro na URL ("" = remove). */
  function mudarFiltro(campo: 'mes' | 'unidade' | 'operador', valor: string) {
    setParams((atual) => {
      const novo = new URLSearchParams(atual)
      if (valor) novo.set(campo, valor)
      else novo.delete(campo)
      return novo
    })
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
        /* o relatório já mostra o erro de conexão */
      })
  }, [verTodas])

  // -------------------------------------------------------------------------
  // Relatório
  // -------------------------------------------------------------------------
  const chave = montarQuery({ mes, unidade, operador })
  const [resultado, setResultado] = useState<Resultado>()
  // "Carregando" é derivado: o que está na tela ainda é de outros filtros
  const carregando = resultado?.chave !== chave

  useEffect(() => {
    const controle = new AbortController()
    apiGet<Relatorio>(`/relatorios/producao${chave}`, controle.signal)
      .then((relatorio) => setResultado({ chave, relatorio }))
      .catch((e: Error) => {
        if (!controle.signal.aborted) setResultado({ chave, erro: e.message })
      })
    // Trocou o filtro antes de responder: descarta a resposta antiga
    return () => controle.abort()
  }, [chave])

  const relatorio = resultado && 'relatorio' in resultado ? resultado.relatorio : undefined
  const vazio = relatorio?.total.total === 0

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={verTodas ? 'Produção da equipe de pós-venda no mês' : 'Sua produção no mês'}
      />

      {/* ---------- Filtros ---------- */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="d-mes" className="form-label small mb-1">
                Mês
              </label>
              <select id="d-mes" className="form-select" value={mes} onChange={(e) => mudarFiltro('mes', e.target.value)}>
                {/* Mês vindo de um link antigo, fora da lista */}
                {!meses.includes(mes) && <option value={mes}>{mesPorExtenso(mes)}</option>}
                {meses.map((m) => (
                  <option key={m} value={m}>
                    {mesPorExtenso(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-lg-2">
              <label htmlFor="d-unidade" className="form-label small mb-1">
                Unidade
              </label>
              <select
                id="d-unidade"
                className="form-select"
                value={unidade}
                onChange={(e) => mudarFiltro('unidade', e.target.value)}
              >
                <option value="">Todas</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.sigla}>
                    {u.sigla} — {u.nome}
                  </option>
                ))}
              </select>
            </div>

            {verTodas && (
              <div className="col-6 col-lg-3">
                <label htmlFor="d-operador" className="form-label small mb-1">
                  Operadora
                </label>
                <select
                  id="d-operador"
                  className="form-select"
                  value={operador}
                  onChange={(e) => mudarFiltro('operador', e.target.value)}
                >
                  <option value="">Todas</option>
                  {operadoras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-12 col-lg-auto ms-lg-auto">
              {/* O navegador baixa o arquivo; o cookie de sessão vai junto */}
              <a
                className={`btn btn-primary w-100 ${!relatorio || vazio ? 'disabled' : ''}`}
                href={`/api/relatorios/producao/exportar${chave}`}
                download
                aria-disabled={!relatorio || vazio}
              >
                <i className="bi bi-file-earmark-excel me-1" aria-hidden="true" /> Exportar Excel
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Estados: carregando, erro, mês sem ligações ---------- */}
      {carregando && !relatorio && (
        <div className="text-secondary py-4">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> Calculando o relatório…
        </div>
      )}

      {resultado && 'erro' in resultado && !carregando && (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar o relatório. {resultado.erro}
        </div>
      )}

      {relatorio && vazio && !carregando && (
        <div className="alert alert-light border" role="status">
          Nenhuma ligação registrada em {mesPorExtenso(relatorio.mes)} com estes filtros.
        </div>
      )}

      {/* ---------- Relatório ---------- */}
      {relatorio && !vazio && (
        // Enquanto recalcula com outro filtro, o relatório antigo fica apagadinho
        <div className={carregando ? 'opacity-50' : undefined} aria-busy={carregando}>
          <CardsIndicadores total={relatorio.total} />

          <div className="row g-3 mb-3">
            <div className={relatorio.causasResumo.length ? 'col-12 col-xl-7' : 'col-12'}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h2 className="h6 mb-3">{verTodas ? 'Funil por operadora' : 'Seu funil no mês'}</h2>
                  <GraficoProducao porOperadora={relatorio.porOperadora} />
                </div>
              </div>
            </div>
            {relatorio.causasResumo.length > 0 && (
              <div className="col-12 col-xl-5">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h2 className="h6 mb-3">Falou e não agendou: por quê?</h2>
                    <GraficoCausas causasResumo={relatorio.causasResumo} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {verTodas && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-3">Operadora × unidade</h2>
                <TabelaContagens
                  legenda="Produção por operadora e unidade"
                  cabecalhos={['Operadora', 'Unidade']}
                  nomes={(l) => [l.operadora.nome, l.unidade.sigla]}
                  chave={(l) => `${l.operadora.id}|${l.unidade.sigla}`}
                  linhas={relatorio.linhas}
                  total={relatorio.total}
                />
              </div>
            </div>
          )}

          <div className="row g-3 mb-3">
            <div className={verTodas ? 'col-12 col-xxl-6' : 'col-12'}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h2 className="h6 mb-3">Por unidade</h2>
                  <TabelaContagens
                    legenda="Produção por unidade"
                    cabecalhos={['Unidade']}
                    nomes={(u) => [u.unidade.sigla]}
                    chave={(u) => u.unidade.sigla}
                    linhas={relatorio.porUnidade}
                    total={relatorio.total}
                  />
                </div>
              </div>
            </div>
            {verTodas && (
              <div className="col-12 col-xxl-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h2 className="h6 mb-1">Ranking por operadora</h2>
                    <p className="small text-secondary mb-3">Clique no título de uma coluna para ordenar.</p>
                    <TabelaContagens
                      legenda="Ranking por operadora"
                      cabecalhos={['Operadora']}
                      nomes={(o) => [o.operadora.nome]}
                      chave={(o) => String(o.operadora.id)}
                      linhas={relatorio.porOperadora}
                      total={relatorio.total}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {relatorio.causas.length > 0 && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-3">Causas de "falou e não agendou"</h2>
                <TabelaCausas causas={relatorio.causas} mostrarOperadora={verTodas} />
              </div>
            </div>
          )}

          <p className="small text-secondary mb-0">
            Cada cliente conta uma vez no mês, mesmo com várias ligações. A operadora é quem fez a última ligação
            do mês; os concluídos são os agendados no mês que já vieram à oficina.
          </p>
        </div>
      )}
    </>
  )
}
