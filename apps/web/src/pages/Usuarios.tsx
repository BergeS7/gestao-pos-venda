/**
 * pages/Usuarios.tsx — Usuários e auditoria (Etapa 9, só Admin)
 *
 * Duas abas:
 *  - EQUIPE: lista de usuários; criar (com senha provisória), editar,
 *    redefinir a senha e ativar/desativar. Ninguém é apagado: quem sai da
 *    equipe é DESATIVADO, perde o acesso na hora e as revisões abertas da
 *    carteira voltam para "sem operadora";
 *  - AUDITORIA: quem alterou o quê e quando (components/usuarios/TabelaAuditoria.tsx).
 *
 * As regras (não desativar a si mesmo, sempre ter um Admin ativo...) ficam na
 * API (services/usuarios.ts); aqui mostramos a mensagem que ela devolver.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/contexto.ts'
import PageHeader from '../components/PageHeader.tsx'
import CampoSenhaProvisoria from '../components/usuarios/CampoSenhaProvisoria.tsx'
import FormUsuario, { type DadosUsuario } from '../components/usuarios/FormUsuario.tsx'
import TabelaAuditoria from '../components/usuarios/TabelaAuditoria.tsx'
import { apiEnviar, apiGet, errosDosCampos, type Unidade, type UsuarioAdmin } from '../lib/api.ts'
import { dataHoraBR, plural } from '../lib/formatar.ts'
import { ROTULO_PERFIL } from '../lib/permissoes.ts'
import { gerarSenhaProvisoria } from '../lib/senhas.ts'

/** Mensagem de retorno de uma ação. */
type Aviso = { tipo: 'success' | 'danger'; texto: string }

/** O que está aberto acima da tabela: formulário de novo/edição ou redefinição de senha. */
type Painel = { tipo: 'novo' } | { tipo: 'editar'; usuario: UsuarioAdmin } | { tipo: 'senha'; usuario: UsuarioAdmin }

export default function Usuarios() {
  const { usuario: eu } = useAuth()
  const [aba, setAba] = useState<'equipe' | 'auditoria'>('equipe')

  // ---- Dados ----
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>()
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [erroCarga, setErroCarga] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    apiGet<UsuarioAdmin[]>('/usuarios')
      .then((u) => {
        setUsuarios(u)
        setErroCarga('')
      })
      .catch((e: Error) => setErroCarga(e.message))
  }, [recarga])

  useEffect(() => {
    apiGet<Unidade[]>('/unidades')
      .then(setUnidades)
      .catch(() => {
        /* sem unidades o formulário mostra a lista vazia; o erro de conexão aparece na tabela */
      })
  }, [])

  // ---- Ações ----
  const [painel, setPainel] = useState<Painel>()
  const [aviso, setAviso] = useState<Aviso>()
  const [enviando, setEnviando] = useState(false)
  const [errosApi, setErrosApi] = useState<Record<string, string[]>>({})
  const [senhaNova, setSenhaNova] = useState('')

  function abrir(p: Painel | undefined) {
    setPainel(p)
    setErrosApi({})
    setAviso(undefined)
    if (p?.tipo === 'senha') setSenhaNova(gerarSenhaProvisoria())
  }

  /** Executa uma gravação: mostra o aviso, fecha o painel e recarrega a lista. */
  async function executar(acao: () => Promise<string>) {
    setEnviando(true)
    setAviso(undefined)
    setErrosApi({})
    try {
      const texto = await acao()
      setAviso({ tipo: 'success', texto })
      setPainel(undefined)
      setRecarga((n) => n + 1)
    } catch (e) {
      const campos = errosDosCampos(e)
      setErrosApi(campos)
      // Erro de um campo que não está na tela (ex.: "ativo"): mostra no aviso
      const primeiro = Object.values(campos)[0]?.[0]
      setAviso({ tipo: 'danger', texto: primeiro ?? (e as Error).message })
    } finally {
      setEnviando(false)
    }
  }

  function salvar(dados: DadosUsuario) {
    void executar(async () => {
      if (painel?.tipo === 'editar') {
        await apiEnviar('PATCH', `/usuarios/${painel.usuario.id}`, dados)
        return `Dados de ${dados.nome} salvos.`
      }
      await apiEnviar('POST', '/usuarios', dados)
      return `Usuário "${dados.nome}" criado. Entregue a senha provisória: ${dados.senhaProvisoria}`
    })
  }

  function redefinir(u: UsuarioAdmin) {
    void executar(async () => {
      await apiEnviar('POST', `/usuarios/${u.id}/senha`, { senhaProvisoria: senhaNova })
      return `Nova senha provisória de ${u.nome}: ${senhaNova}. Os acessos abertos dessa pessoa foram encerrados.`
    })
  }

  function alternarAtivo(u: UsuarioAdmin) {
    if (u.ativo && !window.confirm(`Desativar ${u.nome}? A pessoa perde o acesso na hora e as revisões abertas da carteira dela voltam para "sem operadora".`)) {
      return
    }
    void executar(async () => {
      const r = await apiEnviar<{ revisoesLiberadas: number }>('PATCH', `/usuarios/${u.id}`, { ativo: !u.ativo })
      if (u.ativo) {
        const extra = r.revisoesLiberadas > 0 ? ` ${plural(r.revisoesLiberadas, 'revisão voltou', 'revisões voltaram')} para "sem operadora".` : ''
        return `Usuário "${u.nome}" desativado.${extra}`
      }
      return `Usuário "${u.nome}" reativado.`
    })
  }

  // ---- Tela ----
  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <PageHeader title="Usuários" subtitle="Acessos, perfis e registro de alterações" />
        {aba === 'equipe' && (
          <button type="button" className="btn btn-primary" onClick={() => abrir({ tipo: 'novo' })}>
            <i className="bi bi-person-plus me-1" aria-hidden="true" /> Novo usuário
          </button>
        )}
      </div>

      <ul className="nav nav-tabs mb-3">
        {(
          [
            ['equipe', 'Equipe', 'bi-people'],
            ['auditoria', 'Auditoria', 'bi-journal-text'],
          ] as const
        ).map(([valor, rotulo, icone]) => (
          <li className="nav-item" key={valor}>
            <button
              type="button"
              className={`nav-link ${aba === valor ? 'active' : ''}`}
              aria-current={aba === valor ? 'page' : undefined}
              onClick={() => setAba(valor)}
            >
              <i className={`bi ${icone} me-1`} aria-hidden="true" /> {rotulo}
            </button>
          </li>
        ))}
      </ul>

      {aba === 'auditoria' ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <TabelaAuditoria />
          </div>
        </div>
      ) : (
        <>
          {aviso && (
            <div className={`alert alert-${aviso.tipo} alert-dismissible`} role="status">
              {aviso.texto}
              <button type="button" className="btn-close" onClick={() => setAviso(undefined)} aria-label="Fechar aviso" />
            </div>
          )}

          {(painel?.tipo === 'novo' || painel?.tipo === 'editar') && (
            <FormUsuario
              key={painel.tipo === 'editar' ? painel.usuario.id : 'novo'}
              usuario={painel.tipo === 'editar' ? painel.usuario : undefined}
              unidades={unidades}
              enviando={enviando}
              errosApi={errosApi}
              onSalvar={salvar}
              onCancelar={() => abrir(undefined)}
            />
          )}

          {painel?.tipo === 'senha' && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-3">
                  <i className="bi bi-key me-2 text-primary" aria-hidden="true" /> Redefinir a senha de {painel.usuario.nome}
                </h2>
                <div style={{ maxWidth: 420 }}>
                  <CampoSenhaProvisoria
                    id="r-senha"
                    valor={senhaNova}
                    onMudar={setSenhaNova}
                    erro={errosApi.senhaProvisoria?.[0]}
                  />
                </div>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="btn btn-warning" disabled={enviando || !senhaNova} onClick={() => redefinir(painel.usuario)}>
                    Redefinir senha
                  </button>
                  <button type="button" className="btn btn-link" onClick={() => abrir(undefined)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {erroCarga ? (
                <div className="alert alert-danger mb-0">{erroCarga}</div>
              ) : !usuarios ? (
                <div className="text-center text-secondary py-5">
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> Carregando…
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Nome</th>
                        <th scope="col">Perfil</th>
                        <th scope="col">Unidade</th>
                        <th scope="col">Último acesso</th>
                        <th scope="col" className="text-end">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u) => (
                        <tr key={u.id} className={u.ativo ? undefined : 'text-secondary'}>
                          <td>
                            <span className="fw-semibold">{u.nome}</span>
                            {u.id === eu?.id && <span className="badge text-bg-light border ms-2">você</span>}
                            {!u.ativo && <span className="badge text-bg-secondary ms-2">Inativo</span>}
                            {u.ativo && u.trocarSenha && <span className="badge text-bg-warning ms-2">Senha provisória</span>}
                            {u.ativo && !u.temSenha && <span className="badge text-bg-danger ms-2">Sem senha</span>}
                            <div className="small text-secondary">{u.email}</div>
                          </td>
                          <td>{ROTULO_PERFIL[u.perfil]}</td>
                          <td>{u.unidade?.sigla ?? <span className="text-secondary">Todas</span>}</td>
                          <td className="small text-nowrap">{u.ultimoAcesso ? dataHoraBR(u.ultimoAcesso) : 'Nunca entrou'}</td>
                          <td className="text-end text-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary me-1"
                              onClick={() => abrir({ tipo: 'editar', usuario: u })}
                              aria-label={`Editar ${u.nome}`}
                              title="Editar"
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary me-1"
                              onClick={() => abrir({ tipo: 'senha', usuario: u })}
                              aria-label={`Redefinir a senha de ${u.nome}`}
                              title="Redefinir senha"
                            >
                              <i className="bi bi-key" aria-hidden="true" />
                            </button>
                            {u.id !== eu?.id && (
                              <button
                                type="button"
                                className={`btn btn-sm ${u.ativo ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                disabled={enviando}
                                onClick={() => alternarAtivo(u)}
                              >
                                {u.ativo ? 'Desativar' : 'Reativar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
