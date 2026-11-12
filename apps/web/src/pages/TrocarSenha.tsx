/**
 * pages/TrocarSenha.tsx — Trocar a própria senha (Etapa 9)
 *
 * Usada de dois jeitos:
 *  - OBRIGATÓRIA: no primeiro login (senha provisória dada pelo Admin), o
 *    App.tsx mostra só esta tela, sem menu, até a senha ser trocada;
 *  - VOLUNTÁRIA: pelo link "Trocar senha" da barra superior (/minha-senha).
 *
 * Regra da senha (a mesma da API, schemas/auth.ts): 8+ caracteres, com letras e números.
 * Ao trocar, os logins abertos em outros computadores deixam de valer.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/contexto.ts'
import PageHeader from '../components/PageHeader.tsx'
import { apiEnviar, errosDosCampos, type UsuarioLogado } from '../lib/api.ts'
import { problemaDaSenha } from '../lib/senhas.ts'

export default function TrocarSenha({ obrigatoria = false }: { obrigatoria?: boolean }) {
  const { usuario, atualizar, sair } = useAuth()
  const navigate = useNavigate()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [tentou, setTentou] = useState(false)
  const [erros, setErros] = useState<Record<string, string[]>>({})
  const [erroGeral, setErroGeral] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Validação local, mostrada depois da primeira tentativa de enviar
  const local: Record<string, string | undefined> = {
    senhaAtual: senhaAtual ? undefined : 'Informe a senha atual',
    novaSenha: problemaDaSenha(novaSenha) ?? (novaSenha === senhaAtual ? 'A nova senha precisa ser diferente da atual' : undefined),
    confirmacao: confirmacao === novaSenha ? undefined : 'As senhas não são iguais',
  }
  const erroDe = (campo: string) => (tentou ? local[campo] : undefined) ?? erros[campo]?.[0]

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (Object.values(local).some(Boolean)) return
    setEnviando(true)
    setErros({})
    setErroGeral('')
    try {
      const u = await apiEnviar<UsuarioLogado>('POST', '/auth/senha', { senhaAtual, novaSenha })
      atualizar(u)
      setSucesso(true)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
      setTentou(false)
      if (obrigatoria) navigate('/dashboard', { replace: true })
    } catch (err) {
      const campos = errosDosCampos(err)
      setErros(campos)
      if (Object.keys(campos).length === 0) setErroGeral((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  const formulario = (
    <form className="card border-0 shadow-sm" onSubmit={enviar} noValidate style={{ maxWidth: 440 }}>
      <div className="card-body">
        {obrigatoria && (
          <div className="alert alert-info small">
            Olá, {usuario?.nome}. Você entrou com uma <strong>senha provisória</strong>. Crie uma senha só sua para
            continuar.
          </div>
        )}
        {sucesso && <div className="alert alert-success small">Senha alterada.</div>}
        {erroGeral && <div className="alert alert-danger small">{erroGeral}</div>}

        {/* Campo escondido com o e-mail: ajuda o gerenciador de senhas do navegador */}
        <input type="email" className="d-none" autoComplete="username" value={usuario?.email ?? ''} readOnly />

        {(
          [
            ['senhaAtual', obrigatoria ? 'Senha provisória' : 'Senha atual', senhaAtual, setSenhaAtual, 'current-password'],
            ['novaSenha', 'Nova senha', novaSenha, setNovaSenha, 'new-password'],
            ['confirmacao', 'Repita a nova senha', confirmacao, setConfirmacao, 'new-password'],
          ] as const
        ).map(([campo, rotulo, valor, mudar, auto]) => (
          <div className="mb-3" key={campo}>
            <label htmlFor={`s-${campo}`} className="form-label small fw-semibold mb-1">
              {rotulo}
            </label>
            <input
              id={`s-${campo}`}
              type="password"
              className={`form-control ${erroDe(campo) ? 'is-invalid' : ''}`}
              autoComplete={auto}
              value={valor}
              onChange={(e) => mudar(e.target.value)}
            />
            <div className="invalid-feedback">{erroDe(campo)}</div>
            {campo === 'novaSenha' && <div className="form-text">Pelo menos 8 caracteres, com letras e números.</div>}
          </div>
        ))}

        <div className="d-flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            Salvar nova senha
          </button>
          {obrigatoria && (
            <button type="button" className="btn btn-link" onClick={() => void sair()}>
              Sair
            </button>
          )}
        </div>
      </div>
    </form>
  )

  // Obrigatória: tela cheia, sem menu
  if (obrigatoria) {
    return (
      <main className="tela-login">
        <div className="w-100" style={{ maxWidth: 440 }}>
          <h1 className="h5 mb-3 text-center">Crie sua senha</h1>
          {formulario}
        </div>
      </main>
    )
  }

  return (
    <>
      <PageHeader title="Trocar senha" subtitle="Os logins abertos em outros computadores serão encerrados" />
      {formulario}
    </>
  )
}
