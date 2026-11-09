/**
 * PageHeader.tsx — Título padrão das páginas
 *
 * Garante que todas as páginas tenham o mesmo cabeçalho (título + subtítulo
 * opcional), com estilo definido em `.page-header` (src/styles/_layout.scss).
 *
 * Uso:
 *   <PageHeader title="Importações" subtitle="Arquivos exportados do Cloud" />
 */

type Props = {
  /** Título principal (vira o <h1> da página). */
  title: string
  /** Texto de apoio abaixo do título (opcional). */
  subtitle?: string
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}
