/**
 * pages/Importacoes.tsx — Importações — upload e cruzamento dos relatórios do Cloud. Será construída na Etapa 6 (ROTEIRO.md).
 */

import EmBreve from '../components/EmBreve.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function Importacoes() {
  return (
    <>
      <PageHeader
        title="Importações"
        subtitle="Lista de revisões e espelhamento de OS exportados do Cloud"
      />
      <EmBreve etapa="Etapa 6" descricao="Arquivos → Validação → Cruzamento por chassi → Confirmação." />
    </>
  )
}
