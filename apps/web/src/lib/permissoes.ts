/**
 * lib/permissoes.ts — O que cada perfil pode fazer na tela (Etapa 9)
 *
 * Espelha as permissões da API (apps/api/src/middleware/auth.ts e as rotas).
 * Aqui servem só para ESCONDER botões e menus que o perfil não pode usar:
 * quem garante a segurança de verdade é a API, que recusa (403) qualquer
 * ação sem permissão, mesmo que alguém force pela barra de endereço.
 *
 * | Ação          | Operadora        | Gestor | Diretoria | Admin |
 * |---------------|------------------|--------|-----------|-------|
 * | ver a fila    | só a carteira    | tudo   | tudo      | tudo  |
 * | atender       | sim (carteira)   | sim    | —         | sim   |
 * | gerir a fila  | —                | sim    | —         | sim   |
 * | importar      | —                | sim    | —         | sim   |
 * | usuários      | —                | —      | —         | sim   |
 */

import type { Perfil, UsuarioLogado } from './api.ts'

/** Ações controladas por perfil. */
export type Permissao = 'atender' | 'gerirFila' | 'importar' | 'usuarios' | 'verTodasCarteiras'

/** Perfis que podem cada ação. */
const PERFIS_POR_PERMISSAO: Record<Permissao, Perfil[]> = {
  atender: ['OPERADORA', 'GESTOR', 'ADMIN'],
  gerirFila: ['GESTOR', 'ADMIN'],
  importar: ['GESTOR', 'ADMIN'],
  usuarios: ['ADMIN'],
  verTodasCarteiras: ['GESTOR', 'DIRETORIA', 'ADMIN'],
}

/** true se o usuário tem a permissão. Sem usuário = não pode nada. */
export function pode(usuario: UsuarioLogado | null | undefined, permissao: Permissao): boolean {
  return !!usuario && PERFIS_POR_PERMISSAO[permissao].includes(usuario.perfil)
}

/** Nome de cada perfil para mostrar na tela. */
export const ROTULO_PERFIL: Record<Perfil, string> = {
  OPERADORA: 'Operadora',
  GESTOR: 'Gestor',
  DIRETORIA: 'Diretoria',
  ADMIN: 'Admin',
}

/** Todos os perfis, na ordem em que aparecem nos seletores. */
export const PERFIS: Perfil[] = ['OPERADORA', 'GESTOR', 'DIRETORIA', 'ADMIN']
