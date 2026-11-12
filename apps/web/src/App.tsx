/**
 * App.tsx — Mapa de rotas do frontend
 *
 * Define qual página aparece para cada URL.
 * Todas as páginas ficam "dentro" do <Layout />, que desenha o menu lateral
 * e a barra superior. O conteúdo da página aparece no <Outlet /> do Layout.
 *
 * Para criar uma página nova:
 *  1. Crie o componente em src/pages/;
 *  2. Adicione uma <Route> aqui;
 *  3. Se ela deve aparecer no menu, inclua um item em src/components/menu.ts.
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Revisoes from './pages/Revisoes.tsx'
import RevisaoDetalhe from './pages/RevisaoDetalhe.tsx'
import Atendimentos from './pages/Atendimentos.tsx'
import Importacoes from './pages/Importacoes.tsx'
import Usuarios from './pages/Usuarios.tsx'
import NaoEncontrada from './pages/NaoEncontrada.tsx'

export default function App() {
  return (
    <Routes>
      {/* Rota "pai" sem caminho: só aplica o Layout às rotas filhas */}
      <Route element={<Layout />}>
        {/* "/" redireciona para o Dashboard. replace = não cria entrada extra no histórico */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="revisoes" element={<Revisoes />} />
        {/* Tela do cliente: registrar contato e histórico (Etapa 8) */}
        <Route path="revisoes/:id" element={<RevisaoDetalhe />} />
        <Route path="atendimentos" element={<Atendimentos />} />
        <Route path="importacoes" element={<Importacoes />} />
        <Route path="usuarios" element={<Usuarios />} />
        {/* Qualquer outra URL: página 404 */}
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}
