import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

// Itens do menu lateral
export const menu = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { to: '/revisoes', label: 'Fila de revisões', icon: 'bi-people' },
  { to: '/atendimentos', label: 'Atendimentos', icon: 'bi-headset' },
  { to: '/importacoes', label: 'Importações', icon: 'bi-upload' },
  { to: '/usuarios', label: 'Usuários', icon: 'bi-person-gear' },
]

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()

  // Fecha o menu (no celular) ao trocar de página
  useEffect(() => {
    setMenuAberto(false)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuAberto ? 'is-open' : ''}`} aria-label="Menu principal">
        <div className="sidebar-brand">
          <div className="brand-name">
            Maranhão
            <br />
            Motos
          </div>
          <div className="brand-bar" />
          <div className="brand-sub">Pós-Venda Oficina</div>
        </div>

        <nav className="sidebar-nav nav flex-column">
          {menu.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link">
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">Versão em desenvolvimento</div>
      </aside>

      {menuAberto && (
        <div className="sidebar-backdrop d-lg-none" onClick={() => setMenuAberto(false)} />
      )}

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-lg-none"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <i className="bi bi-list" />
          </button>
          <span className="topbar-title text-truncate">
            <span className="d-none d-sm-inline">Maranhão Motos · </span>Pós-Venda Oficina
          </span>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
