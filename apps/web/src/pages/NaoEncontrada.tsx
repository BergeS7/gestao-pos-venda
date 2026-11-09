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
