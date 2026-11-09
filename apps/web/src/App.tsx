import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Revisoes from './pages/Revisoes.tsx'
import Atendimentos from './pages/Atendimentos.tsx'
import Importacoes from './pages/Importacoes.tsx'
import Usuarios from './pages/Usuarios.tsx'
import NaoEncontrada from './pages/NaoEncontrada.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="revisoes" element={<Revisoes />} />
        <Route path="atendimentos" element={<Atendimentos />} />
        <Route path="importacoes" element={<Importacoes />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}
