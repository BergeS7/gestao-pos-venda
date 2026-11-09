/**
 * pages/Usuarios.tsx — Usuários — acessos e perfis da equipe. Será construída na Etapa 9 (ROTEIRO.md).
 */

import EmBreve from '../components/EmBreve.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function Usuarios() {
  return (
    <>
      <PageHeader title="Usuários" subtitle="Acessos e permissões da equipe" />
      <EmBreve etapa="Etapa 9" descricao="Perfis: Operadora, Gestor, Diretoria e Administrador." />
    </>
  )
}
