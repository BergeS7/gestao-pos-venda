/**
 * auth/contexto.ts — Sessão de login compartilhada pelo app (Etapa 9)
 *
 * Qualquer componente descobre quem está logado com:
 *   const { usuario, sair } = useAuth()
 *
 * O "provedor" que preenche estes dados é o <AuthProvider> (AuthProvider.tsx),
 * colocado em volta do app inteiro no main.tsx. Este arquivo fica separado do
 * provedor porque a recarga rápida do Vite exige que arquivos de componente
 * exportem só componentes.
 */

import { createContext, useContext } from 'react'
import type { UsuarioLogado } from '../lib/api.ts'

/** O que o contexto de login oferece. */
export type Auth = {
  /** Quem está logado; null = ninguém. */
  usuario: UsuarioLogado | null
  /** true enquanto pergunta à API se já existe uma sessão (ao abrir o sistema). */
  verificando: boolean
  /** Faz login. Lança ErroApi com a mensagem da API se falhar. */
  entrar: (email: string, senha: string) => Promise<UsuarioLogado>
  /** Encerra a sessão e volta para a tela de login. */
  sair: () => Promise<void>
  /** Troca o usuário guardado (ex.: depois de trocar a senha). */
  atualizar: (usuario: UsuarioLogado) => void
  /** true quando a sessão acabou sozinha (venceu): a tela de login avisa. */
  expirou: boolean
  /**
   * true depois de clicar em "Sair". Nesse caso o login NÃO volta para a
   * última página aberta, porque quem entra em seguida pode ser outra pessoa.
   */
  saiu: boolean
}

export const AuthContext = createContext<Auth | null>(null)

/** Lê a sessão de login. Precisa estar dentro do <AuthProvider>. */
export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth precisa estar dentro do <AuthProvider>')
  return auth
}
