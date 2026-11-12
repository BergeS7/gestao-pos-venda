/**
 * Paginacao.tsx — Navegação entre páginas de uma lista
 *
 * Mostra "1–20 de 57" e os botões anterior/próxima. Componente genérico:
 * serve para qualquer listagem paginada da API.
 */

type Props = {
  /** Página atual (começa em 1). */
  pagina: number
  totalPaginas: number
  /** Total de registros (todas as páginas). */
  total: number
  porPagina: number
  /** Chamado com a nova página quando o usuário navega. */
  onMudar: (pagina: number) => void
}

export default function Paginacao({ pagina, totalPaginas, total, porPagina, onMudar }: Props) {
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const fim = Math.min(pagina * porPagina, total)

  return (
    <nav className="d-flex flex-wrap align-items-center justify-content-between gap-2" aria-label="Paginação">
      <span className="small text-secondary">
        {inicio}–{fim} de {total}
      </span>
      <div className="btn-group btn-group-sm">
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={pagina <= 1}
          onClick={() => onMudar(pagina - 1)}
          aria-label="Página anterior"
        >
          <i className="bi bi-chevron-left" />
        </button>
        <span className="btn btn-outline-secondary disabled" aria-current="page">
          {pagina} / {totalPaginas}
        </span>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={pagina >= totalPaginas}
          onClick={() => onMudar(pagina + 1)}
          aria-label="Próxima página"
        >
          <i className="bi bi-chevron-right" />
        </button>
      </div>
    </nav>
  )
}
