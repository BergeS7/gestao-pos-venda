/**
 * Layout.tsx — Estrutura comum a todas as páginas
 *
 * Desenha:
 *  - o menu lateral (marca + links das páginas);
 *  - a barra superior (com o botão ☰ que abre o menu no celular);
 *  - a área de conteúdo, onde o React Router coloca a página atual (<Outlet />).
 *
 * Comportamento responsivo (estilos em src/styles/_layout.scss):
 *  - telas grandes (≥ 992px): menu sempre visível à esquerda;
 *  - telas menores: menu escondido, abre pelo botão ☰ sobre um fundo escuro
 *    e fecha ao escolher uma página ou tocar fora dele.
 */

import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { menu } from './menu.ts'

export default function Layout() {
  // Controla se o menu está aberto no celular. No desktop não tem efeito.
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="app-shell">
      {/* ---------- Menu lateral ---------- */}
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
            // NavLink adiciona a classe "active" quando a URL corresponde ao link,
            // o que destaca a página atual em vermelho.
            <NavLink
              key={item.to}
              to={item.to}
              className="nav-link"
              onClick={() => setMenuAberto(false)} // fecha o menu no celular ao trocar de página
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">Versão em desenvolvimento</div>
      </aside>

      {/* Fundo escuro atrás do menu aberto no celular; tocar nele fecha o menu */}
      {menuAberto && (
        <div className="sidebar-backdrop d-lg-none" onClick={() => setMenuAberto(false)} />
      )}

      {/* ---------- Área principal ---------- */}
      <div className="main">
        <header className="topbar">
          {/* Botão ☰: só aparece em telas menores que "lg" (d-lg-none) */}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-lg-none"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <i className="bi bi-list" />
          </button>
          {/* No celular mostra só "Pós-Venda Oficina" para caber em uma linha */}
          <span className="topbar-title text-truncate">
            <span className="d-none d-sm-inline">Maranhão Motos · </span>Pós-Venda Oficina
          </span>
        </header>

        <main className="content">
          {/* A página da rota atual é renderizada aqui */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
