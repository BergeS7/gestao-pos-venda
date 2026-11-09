/**
 * pages/NaoEncontrada.tsx — Página 404 — exibida quando a URL não corresponde a nenhuma rota de App.tsx.
 */

import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.tsx'

export default function NaoEncontrada() {
  return (
    <>
      <PageHeader title="Página não encontrada" />
      <Link to="/dashboard" className="btn btn-primary">
        Voltar ao Dashboard
      </Link>
    </>
  )
}
