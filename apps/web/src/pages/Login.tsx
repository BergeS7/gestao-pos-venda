/**
 * pages/Login.tsx — Tela de login (Etapa 9)
 *
 * Aparece para quem não está logado, fora do Layout (sem menu).
 * Depois de entrar, o App.tsx leva para a página que a pessoa tentou abrir
 * (guardada em `location.state.de`), ou para o Dashboard.
 *
 * As mensagens de erro vêm da API: "E-mail ou senha incorretos." (sem dizer
 * qual dos dois) e "Muitas tentativas erradas..." depois de 5 erros.
 */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/contexto.ts'

export default function Login() {
  const { entrar, expirou } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha.')
      return
    }
    setEnviando(true)
    setErro('')
    try {
      // Deu certo: o App.tsx troca de tela sozinho ao saber quem entrou
      // (esta tela some, então não é preciso desligar o "enviando")
      await entrar(email, senha)
    } catch (err) {
      setErro((err as Error).message)
      setSenha('')
      setEnviando(false)
    }
  }

  return (
    <main className="tela-login">
      <form className="card border-0 shadow tela-login-card" onSubmit={enviar} noValidate>
        {/* Logo colorida (texto preto) sobre o fundo branco do cartão */}
        <div className="tela-login-marca">
          <img
            className="brand-logo"
            src="/marca/logo.webp"
            alt="Gestão Pós-Venda"
            width={360}
            height={127}
          />
          <div className="brand-sub">Maranhão Motos</div>
        </div>

        <div className="card-body p-4">
          <h1 className="h5 mb-3">Entrar</h1>

          {expirou && !erro && (
            <div className="alert alert-warning py-2 small" role="status">
              Sua sessão expirou. Entre de novo para continuar.
            </div>
          )}
          {erro && (
            <div className="alert alert-danger py-2 small" role="alert">
              {erro}
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="login-email" className="form-label small fw-semibold">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="login-senha" className="form-label small fw-semibold">
              Senha
            </label>
            <div className="input-group">
              <input
                id="login-senha"
                type={mostrarSenha ? 'text' : 'password'}
                className="form-control"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
              >
                <i className={`bi ${mostrarSenha ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
            {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            Entrar
          </button>

          <p className="small text-secondary mt-3 mb-0">Esqueceu a senha? Peça ao administrador para redefinir.</p>
        </div>
      </form>
    </main>
  )
}
