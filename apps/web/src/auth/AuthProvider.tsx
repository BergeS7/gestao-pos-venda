/**
 * auth/AuthProvider.tsx — Guarda a sessão de login (Etapa 9)
 *
 * Ao abrir o sistema, pergunta à API "quem sou eu?" (GET /api/auth/eu).
 * O cookie de sessão é httpOnly, então o navegador o envia sozinho e o
 * JavaScript nunca vê o token: aqui guardamos só os dados do usuário.
 *
 * Se qualquer chamada responder 401 (sessão vencida), lib/api.ts dispara o
 * evento EVENTO_SESSAO_EXPIRADA e este provedor esquece o usuário, o que
 * leva de volta à tela de login com o aviso "sua sessão expirou".
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiEnviar, apiGet, EVENTO_SESSAO_EXPIRADA, type UsuarioLogado } from '../lib/api.ts'
import { AuthContext, type Auth } from './contexto.ts'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null)
  const [verificando, setVerificando] = useState(true)
  const [expirou, setExpirou] = useState(false)
  const [saiu, setSaiu] = useState(false)

  // Já existe sessão? (ex.: recarregou a página)
  useEffect(() => {
    apiGet<UsuarioLogado>('/auth/eu')
      .then(setUsuario)
      .catch(() => setUsuario(null)) // 401 = ninguém logado; API fora do ar também cai no login
      .finally(() => setVerificando(false))
  }, [])

  // Sessão acabou no meio do uso
  useEffect(() => {
    function aoExpirar() {
      setUsuario((atual) => {
        if (atual) setExpirou(true)
        return null
      })
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    const u = await apiEnviar<UsuarioLogado>('POST', '/auth/login', { email, senha })
    setExpirou(false)
    setSaiu(false)
    setUsuario(u)
    return u
  }, [])

  const sair = useCallback(async () => {
    try {
      await apiEnviar('POST', '/auth/logout')
    } finally {
      // Mesmo se a API não responder, a tela esquece o usuário
      setExpirou(false)
      setSaiu(true)
      setUsuario(null)
    }
  }, [])

  const valor = useMemo<Auth>(
    () => ({ usuario, verificando, entrar, sair, atualizar: setUsuario, expirou, saiu }),
    [usuario, verificando, entrar, sair, expirou, saiu],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
