/**
 * pages/Revisoes.tsx — Fila de revisões — lista de clientes elegíveis por revisão. Será construída na Etapa 7 (ROTEIRO.md).
 */

import EmBreve from '../components/EmBreve.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function Revisoes() {
  return (
    <>
      <PageHeader title="Fila de revisões" subtitle="Clientes elegíveis por revisão (1000, 6000, 12000 e 18000 km)" />
      <EmBreve etapa="Etapa 7" descricao="Lista com filtros por unidade, operadora, revisão e situação." />
    </>
  )
}
