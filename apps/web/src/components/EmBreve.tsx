type Props = {
  etapa: string
  descricao: string
}

// Marcador para páginas que ainda serão construídas
export default function EmBreve({ etapa, descricao }: Props) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4 text-center">
        <i className="bi bi-cone-striped display-6 text-primary" aria-hidden="true" />
        <h2 className="h5 mt-3">Em construção</h2>
        <p className="text-secondary mb-1">{descricao}</p>
        <span className="badge text-bg-light border">{etapa}</span>
      </div>
    </div>
  )
}
