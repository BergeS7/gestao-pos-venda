/**
 * Layout.tsx — Estrutura comum a todas as páginas
 *
 * Desenha:
 *  - o menu lateral (logo + links das páginas);
 *  - a barra superior (com o botão ☰ que abre o menu no celular, o nome de
 *    quem está logado, "Trocar senha" e "Sair");
 *  - a área de conteúdo, onde o React Router coloca a página atual (<Outlet />).
 *
 * Comportamento responsivo (estilos em src/styles/_layout.scss):
 *  - telas grandes (≥ 992px): menu sempre visível à esquerda;
 *  - telas menores: menu escondido, abre pelo botão ☰ sobre um fundo escuro
 *    e fecha ao escolher uma página ou tocar fora dele.
 *
 * O menu mostra só as páginas que o perfil pode abrir (Etapa 9, ver menu.ts).
 */

import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/contexto.ts'
import { pode, ROTULO_PERFIL } from '../lib/permissoes.ts'
import { menu } from './menu.ts'

export default function Layout() {
  // Controla se o menu está aberto no celular. No desktop não tem efeito.
  const [menuAberto, setMenuAberto] = useState(false)
  const { usuario, sair } = useAuth()
  /** Itens do menu que este perfil pode ver. */
  const itens = menu.filter((item) => !item.permissao || pode(usuario, item.permissao))

  return (
    <div className="app-shell">
      {/* ---------- Menu lateral ---------- */}
      <aside className={`sidebar ${menuAberto ? 'is-open' : ''}`} aria-label="Menu principal">
        <div className="sidebar-brand">
          {/* Logo original sobre a faixa cinza-clara, alinhada com a barra superior */}
          <img
            className="brand-logo"
            src="/marca/logo.webp"
            alt="Gestão Pós-Venda"
            width={360}
            height={127}
          />
          {/* Sem subtítulo aqui: o nome "Maranhão Motos" já aparece na barra superior */}
        </div>

        <nav className="sidebar-nav nav flex-column">
          {itens.map((item) => (
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

          {/* Quem está logado. No celular mostra só os ícones. */}
          {usuario && (
            <div className="topbar-usuario ms-auto d-flex align-items-center gap-2">
              <span className="text-end lh-sm d-none d-md-block">
                <span className="d-block small fw-semibold">{usuario.nome}</span>
                <span className="d-block small text-secondary">{ROTULO_PERFIL[usuario.perfil]}</span>
              </span>
              <Link to="/minha-senha" className="btn btn-sm btn-outline-secondary" title="Trocar senha" aria-label="Trocar senha">
                <i className="bi bi-key" aria-hidden="true" />
              </Link>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void sair()}>
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                <span className="d-none d-sm-inline ms-1">Sair</span>
              </button>
            </div>
          )}
        </header>

        <main className="content">
          {/* A página da rota atual é renderizada aqui */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
