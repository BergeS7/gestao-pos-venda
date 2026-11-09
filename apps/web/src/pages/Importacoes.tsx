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
