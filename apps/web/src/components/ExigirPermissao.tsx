/**
 * components/ExigirPermissao.tsx — Protege uma rota pelo perfil (Etapa 9)
 *
 * Uso em App.tsx:
 *   <Route path="usuarios" element={<ExigirPermissao permissao="usuarios"><Usuarios /></ExigirPermissao>} />
 *
 * Quem não tem a permissão vê um aviso em vez da página. É só conforto: a
 * API recusa (403) as chamadas de quem não pode, mesmo que a tela fosse aberta.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/contexto.ts'
import { pode, type Permissao } from '../lib/permissoes.ts'

export default function ExigirPermissao({ permissao, children }: { permissao: Permissao; children: ReactNode }) {
  const { usuario } = useAuth()
  if (pode(usuario, permissao)) return <>{children}</>
  return (
    <div className="text-center text-secondary py-5">
      <i className="bi bi-shield-lock display-6 d-block mb-2" aria-hidden="true" />
      <p className="mb-2">Seu perfil não tem acesso a esta página.</p>
      <Link to="/dashboard">Voltar ao início</Link>
    </div>
  )
}
