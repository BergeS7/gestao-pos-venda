/**
 * menu.ts — Itens do menu lateral
 *
 * Fica separado do Layout.tsx para que o arquivo do componente exporte só
 * componentes (exigência da recarga rápida do Vite/React).
 *
 * A ordem do array é a ordem em que os itens aparecem no menu.
 * Os ícones vêm do Bootstrap Icons: https://icons.getbootstrap.com/
 */

/** Um item do menu lateral. */
export type MenuItem = {
  /** Caminho da rota (precisa existir em App.tsx). */
  to: string
  /** Texto exibido no menu. */
  label: string
  /** Classe do ícone do Bootstrap Icons (ex.: "bi-people"). */
  icon: string
}

export const menu: MenuItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { to: '/revisoes', label: 'Fila de revisões', icon: 'bi-people' },
  { to: '/atendimentos', label: 'Atendimentos', icon: 'bi-headset' },
  { to: '/importacoes', label: 'Importações', icon: 'bi-upload' },
  { to: '/usuarios', label: 'Usuários', icon: 'bi-person-gear' },
]
