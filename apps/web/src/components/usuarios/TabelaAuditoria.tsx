/**
 * components/usuarios/TabelaAuditoria.tsx — Últimas alterações do sistema (Etapa 9, só Admin)
 *
 * Mostra a tabela `auditoria`: quem fez, o quê, quando e em qual registro.
 * Os detalhes (o que mudou) vêm em JSON e são mostrados de forma resumida.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, type ListaAuditoria } from '../../lib/api.ts'
import { dataHoraBR } from '../../lib/formatar.ts'
import Paginacao from '../Paginacao.tsx'

/** Texto de cada código de ação (services/auditoria.ts da API). */
const ROTULO_ACAO: Record<string, { texto: string; icone: string }> = {
  LOGIN: { texto: 'Entrou no sistema', icone: 'bi-box-arrow-in-right' },
  LOGIN_FALHOU: { texto: 'Login recusado', icone: 'bi-shield-exclamation text-danger' },
  SENHA_TROCADA: { texto: 'Trocou a própria senha', icone: 'bi-key' },
  TENTATIVA_REGISTRADA: { texto: 'Registrou contato', icone: 'bi-telephone' },
  REVISAO_CONCLUIDA: { texto: 'Concluiu revisão', icone: 'bi-check2-circle text-success' },
  REVISAO_REABERTA: { texto: 'Reabriu revisão', icone: 'bi-arrow-counterclockwise' },
  REVISOES_ATRIBUIDAS: { texto: 'Atribuiu revisões', icone: 'bi-person-check' },
  REVISOES_DISTRIBUIDAS: { texto: 'Distribuiu revisões', icone: 'bi-diagram-3' },
  USUARIO_CRIADO: { texto: 'Criou usuário', icone: 'bi-person-plus' },
  USUARIO_ALTERADO: { texto: 'Alterou usuário', icone: 'bi-pencil' },
  SENHA_REDEFINIDA: { texto: 'Redefiniu senha', icone: 'bi-key-fill text-warning' },
}

/** Resume os detalhes em uma linha (ex.: "ativo: true → false"). */
function resumo(detalhes: Record<string, unknown> | null): string {
  if (!detalhes) return ''
  const mudancas = detalhes.mudancas as Record<string, { de: unknown; para: unknown }> | undefined
  if (mudancas) {
    const partes = Object.entries(mudancas).map(([campo, m]) => `${campo}: ${String(m.de)} → ${String(m.para)}`)
    if (detalhes.revisoesLiberadas) partes.push(`${String(detalhes.revisoesLiberadas)} revisões liberadas`)
    return partes.join(' · ') || 'sem mudança'
  }
  return Object.entries(detalhes)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
}

/** Resultado da última busca, marcado com a página que o gerou. */
type Resultado = { pagina: number; dados?: ListaAuditoria; erro?: string }

export default function TabelaAuditoria() {
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState<Resultado>()
  const carregando = resultado?.pagina !== pagina

  useEffect(() => {
    const controle = new AbortController()
    apiGet<ListaAuditoria>(`/auditoria?pagina=${pagina}&porPagina=30`, controle.signal)
      .then((dados) => setResultado({ pagina, dados }))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setResultado({ pagina, erro: e.message })
      })
    return () => controle.abort()
  }, [pagina])

  const lista = resultado?.dados
  if (resultado?.erro) return <div className="alert alert-danger">{resultado.erro}</div>
  if (!lista) {
    return (
      <div className="text-center text-secondary py-5">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> Carregando…
      </div>
    )
  }

  return (
    <div className={carregando ? 'opacity-50' : undefined} aria-busy={carregando}>
      {lista.itens.length === 0 ? (
        <p className="text-secondary text-center py-4 mb-0">Nenhuma alteração registrada ainda.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Quem</th>
                <th scope="col">O quê</th>
                <th scope="col">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {lista.itens.map((ev) => {
                const rotulo = ROTULO_ACAO[ev.acao] ?? { texto: ev.acao, icone: 'bi-dot' }
                return (
                  <tr key={ev.id}>
                    <td className="text-nowrap small">{dataHoraBR(ev.criadoEm)}</td>
                    <td className="small">{ev.usuario?.nome ?? <span className="text-secondary">—</span>}</td>
                    <td className="small text-nowrap">
                      <i className={`bi ${rotulo.icone} me-1`} aria-hidden="true" />
                      {rotulo.texto}
                      {ev.entidade === 'revisoes_alvo' && ev.entidadeId && (
                        <>
                          {' '}
                          <Link to={`/revisoes/${ev.entidadeId}`}>#{ev.entidadeId}</Link>
                        </>
                      )}
                    </td>
                    <td className="small text-secondary text-break">{resumo(ev.detalhes)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3">
        <Paginacao
          pagina={lista.pagina}
          totalPaginas={lista.totalPaginas}
          total={lista.total}
          porPagina={lista.porPagina}
          onMudar={setPagina}
        />
      </div>
    </div>
  )
}
