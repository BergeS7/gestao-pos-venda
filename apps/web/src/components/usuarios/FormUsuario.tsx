/**
 * components/usuarios/FormUsuario.tsx — Criar ou editar um usuário (Etapa 9, só Admin)
 *
 * Criar: nome, e-mail, perfil, unidade e SENHA PROVISÓRIA. O Admin entrega a
 * senha à pessoa, que é obrigada a trocá-la no primeiro login.
 * Editar: nome, e-mail, perfil e unidade (ativar/desativar fica na tabela).
 *
 * A validação aqui só ajuda quem preenche; a API valida de novo
 * (apps/api/src/schemas/usuarios.ts) e os erros dela aparecem nos campos.
 */

import { useState, type FormEvent } from 'react'
import type { Perfil, Unidade, UsuarioAdmin } from '../../lib/api.ts'
import { PERFIS, ROTULO_PERFIL } from '../../lib/permissoes.ts'
import { problemaDaSenha } from '../../lib/senhas.ts'
import CampoSenhaProvisoria from './CampoSenhaProvisoria.tsx'

/** Dados enviados à API (criar: com senhaProvisoria). */
export type DadosUsuario = {
  nome: string
  email: string
  perfil: Perfil
  unidadeId: number | null
  senhaProvisoria?: string
}

type Props = {
  /** Usuário em edição; sem ele, o formulário cria um novo. */
  usuario?: UsuarioAdmin
  unidades: Unidade[]
  enviando: boolean
  /** Erros por campo devolvidos pela API (400). */
  errosApi: Record<string, string[]>
  onSalvar: (dados: DadosUsuario) => void
  onCancelar: () => void
}

/** O que cada perfil faz, para ajudar o Admin a escolher. */
const DESCRICAO_PERFIL: Record<Perfil, string> = {
  OPERADORA: 'Liga para os clientes da própria carteira.',
  GESTOR: 'Vê todas as carteiras, distribui a fila e importa planilhas.',
  DIRETORIA: 'Só consulta a fila e os relatórios.',
  ADMIN: 'Tudo o que o Gestor faz, mais o cadastro de usuários.',
}

export default function FormUsuario({ usuario, unidades, enviando, errosApi, onSalvar, onCancelar }: Props) {
  const editando = Boolean(usuario)
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [perfil, setPerfil] = useState<Perfil>(usuario?.perfil ?? 'OPERADORA')
  const [unidadeId, setUnidadeId] = useState(usuario?.unidade ? String(usuario.unidade.id) : '')
  const [senha, setSenha] = useState('')
  const [tentou, setTentou] = useState(false)

  const local: Record<string, string | undefined> = {
    nome: nome.trim().length >= 3 ? undefined : 'O nome precisa ter pelo menos 3 letras',
    email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : 'E-mail inválido',
    unidadeId: perfil === 'OPERADORA' && !unidadeId ? 'Escolha a unidade da operadora' : undefined,
    senhaProvisoria: editando ? undefined : problemaDaSenha(senha),
  }
  const erroDe = (campo: string) => (tentou ? local[campo] : undefined) ?? errosApi[campo]?.[0]

  function enviar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (Object.values(local).some(Boolean)) return
    onSalvar({
      nome: nome.trim(),
      email: email.trim(),
      perfil,
      unidadeId: unidadeId ? Number(unidadeId) : null,
      ...(!editando && { senhaProvisoria: senha }),
    })
  }

  return (
    <form className="card border-0 shadow-sm mb-3" onSubmit={enviar} noValidate>
      <div className="card-body">
        <h2 className="h6 mb-3">
          <i className={`bi ${editando ? 'bi-pencil' : 'bi-person-plus'} me-2 text-primary`} aria-hidden="true" />
          {editando ? `Editar ${usuario?.nome}` : 'Novo usuário'}
        </h2>

        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="u-nome" className="form-label small fw-semibold mb-1">
              Nome
            </label>
            <input
              id="u-nome"
              className={`form-control ${erroDe('nome') ? 'is-invalid' : ''}`}
              value={nome}
              maxLength={120}
              onChange={(e) => setNome(e.target.value)}
            />
            <div className="invalid-feedback">{erroDe('nome')}</div>
          </div>

          <div className="col-md-6">
            <label htmlFor="u-email" className="form-label small fw-semibold mb-1">
              E-mail (usado para entrar)
            </label>
            <input
              id="u-email"
              type="email"
              autoComplete="off"
              className={`form-control ${erroDe('email') ? 'is-invalid' : ''}`}
              value={email}
              maxLength={160}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="invalid-feedback">{erroDe('email')}</div>
          </div>

          <div className="col-sm-6">
            <label htmlFor="u-perfil" className="form-label small fw-semibold mb-1">
              Perfil
            </label>
            <select
              id="u-perfil"
              className={`form-select ${erroDe('perfil') ? 'is-invalid' : ''}`}
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as Perfil)}
            >
              {PERFIS.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PERFIL[p]}
                </option>
              ))}
            </select>
            <div className="invalid-feedback">{erroDe('perfil')}</div>
            <div className="form-text">{DESCRICAO_PERFIL[perfil]}</div>
          </div>

          <div className="col-sm-6">
            <label htmlFor="u-unidade" className="form-label small fw-semibold mb-1">
              Unidade {perfil !== 'OPERADORA' && <span className="text-secondary fw-normal">(opcional)</span>}
            </label>
            <select
              id="u-unidade"
              className={`form-select ${erroDe('unidadeId') ? 'is-invalid' : ''}`}
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
            >
              <option value="">{perfil === 'OPERADORA' ? 'Escolha…' : 'Todas'}</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.sigla} · {u.nome}
                </option>
              ))}
            </select>
            <div className="invalid-feedback">{erroDe('unidadeId')}</div>
          </div>

          {!editando && (
            <div className="col-sm-6">
              <CampoSenhaProvisoria id="u-senha" valor={senha} onMudar={setSenha} erro={erroDe('senhaProvisoria')} />
            </div>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2 mt-3">
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {editando ? 'Salvar alterações' : 'Criar usuário'}
          </button>
          <button type="button" className="btn btn-link" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </form>
  )
}
