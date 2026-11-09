/**
 * main.tsx — Ponto de entrada do frontend
 *
 * Primeiro arquivo executado no navegador (referenciado em index.html).
 * Responsabilidades:
 *  1. Carregar os estilos globais (ícones e o tema Sass com o Bootstrap);
 *  2. Ativar o roteamento por URL (BrowserRouter);
 *  3. Renderizar o componente <App /> dentro da <div id="root">.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Fonte de ícones do Bootstrap (uso: <i className="bi bi-people" />)
import 'bootstrap-icons/font/bootstrap-icons.css'
// Tema da Maranhão Motos + Bootstrap + layout (ver src/styles/)
import './styles/main.scss'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // StrictMode: em desenvolvimento, faz verificações extras e avisa sobre
  // práticas problemáticas. Não tem efeito na versão de produção.
  <StrictMode>
    {/* BrowserRouter: permite navegar entre páginas pela URL (/dashboard, /importacoes...) */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
