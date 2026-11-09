import EmBreve from '../components/EmBreve.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function Atendimentos() {
  return (
    <>
      <PageHeader title="Atendimentos" subtitle="Registro dos contatos com os clientes" />
      <EmBreve
        etapa="Etapa 8"
        descricao="Conseguiu falar? · Agendou? · Motivo · Data agendada · Próximo contato."
      />
    </>
  )
}
