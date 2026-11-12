/**
 * App.tsx — Mapa de rotas do frontend
 *
 * Define qual página aparece para cada URL, conforme a situação do login (Etapa 9):
 *  - verificando a sessão  → só um indicador de carregamento;
 *  - ninguém logado        → só a tela de login (qualquer URL leva a ela e,
 *                            depois de entrar, volta para a URL pedida; depois
 *                            de um "Sair" não volta, pois pode ser outra pessoa);
 *  - senha provisória      → só a tela "Crie sua senha";
 *  - logado                → as páginas, dentro do <Layout /> (menu + barra superior).
 *
 * Páginas restritas a alguns perfis ficam dentro de <ExigirPermissao>.
 *
 * Para criar uma página nova:
 *  1. Crie o componente em src/pages/;
 *  2. Adicione uma <Route> aqui (com <ExigirPermissao> se for restrita);
 *  3. Se ela deve aparecer no menu, inclua um item em src/components/menu.ts.
 */

import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/contexto.ts'
import ExigirPermissao from './components/ExigirPermissao.tsx'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Revisoes from './pages/Revisoes.tsx'
import RevisaoDetalhe from './pages/RevisaoDetalhe.tsx'
import Atendimentos from './pages/Atendimentos.tsx'
import Importacoes from './pages/Importacoes.tsx'
import Usuarios from './pages/Usuarios.tsx'
import Login from './pages/Login.tsx'
import TrocarSenha from './pages/TrocarSenha.tsx'
import NaoEncontrada from './pages/NaoEncontrada.tsx'

/** Página guardada em `state.de` quando o login foi exigido; senão, o Dashboard. */
function destinoDepoisDoLogin(state: unknown): string {
  const de = (state as { de?: unknown } | null)?.de
  // Só caminhos internos ("/revisoes?..."), nunca um endereço externo
  return typeof de === 'string' && de.startsWith('/') && !de.startsWith('//') ? de : '/dashboard'
}

export default function App() {
  const { usuario, verificando, saiu } = useAuth()
  const location = useLocation()

  if (verificando) {
    return (
      <div className="tela-login">
        <span className="spinner-border text-primary" role="status" aria-label="Carregando" />
      </div>
    )
  }

  // Ninguém logado: tudo leva ao login, lembrando a página pedida
  if (!usuario) {
    return (
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          path="*"
          element={<Navigate to="/login" replace state={saiu ? undefined : { de: location.pathname + location.search }} />}
        />
      </Routes>
    )
  }

  // Senha provisória: precisa trocar antes de qualquer coisa
  if (usuario.trocarSenha) return <TrocarSenha obrigatoria />

  return (
    <Routes>
      {/* Logado em /login: acabou de entrar (ou usou o botão voltar). Vai para a
          página que tinha pedido antes do login (state.de), ou para o início. */}
      <Route path="login" element={<Navigate to={destinoDepoisDoLogin(location.state)} replace />} />

      {/* Rota "pai" sem caminho: só aplica o Layout às rotas filhas */}
      <Route element={<Layout />}>
        {/* "/" redireciona para o Dashboard. replace = não cria entrada extra no histórico */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="revisoes" element={<Revisoes />} />
        {/* Tela do cliente: registrar contato e histórico (Etapa 8) */}
        <Route path="revisoes/:id" element={<RevisaoDetalhe />} />
        <Route path="atendimentos" element={<Atendimentos />} />
        <Route
          path="importacoes"
          element={
            <ExigirPermissao permissao="importar">
              <Importacoes />
            </ExigirPermissao>
          }
        />
        <Route
          path="usuarios"
          element={
            <ExigirPermissao permissao="usuarios">
              <Usuarios />
            </ExigirPermissao>
          }
        />
        <Route path="minha-senha" element={<TrocarSenha />} />
        {/* Qualquer outra URL: página 404 */}
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}
