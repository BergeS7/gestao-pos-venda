/**
 * EmBreve.tsx — Aviso de "página em construção"
 *
 * Usado nas páginas que ainda serão desenvolvidas, indicando em qual etapa do
 * ROTEIRO.md elas serão feitas. Deve ser removido de cada página quando ela
 * for implementada.
 *
 * Uso:
 *   <EmBreve etapa="Etapa 6" descricao="Upload e cruzamento dos relatórios." />
 */

type Props = {
  /** Etapa do ROTEIRO.md em que a página será construída (ex.: "Etapa 6"). */
  etapa: string
  /** Resumo do que a página vai ter. */
  descricao: string
}

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
