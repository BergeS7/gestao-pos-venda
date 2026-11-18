/**
 * menu.ts — Itens do menu lateral
 *
 * Fica separado do Layout.tsx para que o arquivo do componente exporte só
 * componentes (exigência da recarga rápida do Vite/React).
 *
 * A ordem do array é a ordem em que os itens aparecem no menu.
 * Itens com `permissao` só aparecem para os perfis que a têm (lib/permissoes.ts).
 * Os ícones vêm do Bootstrap Icons: https://icons.getbootstrap.com/
 */

import type { Permissao } from '../lib/permissoes.ts'

/** Um item do menu lateral. */
export type MenuItem = {
  /** Caminho da rota (precisa existir em App.tsx). */
  to: string
  /** Texto exibido no menu. */
  label: string
  /** Classe do ícone do Bootstrap Icons (ex.: "bi-people"). */
  icon: string
  /** Se definido, só aparece para quem tem esta permissão. */
  permissao?: Permissao
}

export const menu: MenuItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { to: '/revisoes', label: 'Fila de revisões', icon: 'bi-people' },
  { to: '/agenda', label: 'Agenda do dia', icon: 'bi-calendar2-check' },
  { to: '/importacoes', label: 'Importações', icon: 'bi-upload', permissao: 'importar' },
  { to: '/usuarios', label: 'Usuários', icon: 'bi-person-gear', permissao: 'usuarios' },
  { to: '/privacidade', label: 'Privacidade (LGPD)', icon: 'bi-shield-lock', permissao: 'privacidade' },
]
