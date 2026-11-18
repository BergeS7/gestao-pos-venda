/**
 * components/importacao/Numeros.tsx — Cards de números da prévia de importação (Etapa 6)
 *
 * Uma fileira de cards pequenos: rótulo, número e uma explicação curta.
 * O destaque (cor) chama a atenção para o que importa em cada passo
 * (ex.: inválidas em vermelho, elegíveis em verde).
 */

import { numeroBR } from '../../lib/formatar.ts'

/** Um card: rótulo, valor e, opcionalmente, explicação e cor. */
export type Numero = {
  rotulo: string
  valor: number
  dica?: string
  cor?: 'success' | 'danger' | 'warning' | 'secondary'
}

export default function Numeros({ itens }: { itens: Numero[] }) {
  return (
    <div className="row g-2 mb-3">
      {itens.map((n) => (
        <div key={n.rotulo} className="col-6 col-md-4 col-xl">
          <div className={`card h-100 shadow-sm border-0 ${n.cor ? `border-start border-4 border-${n.cor}` : ''}`}>
            <div className="card-body py-2 px-3">
              <div className="small text-secondary">{n.rotulo}</div>
              <div className={`fs-4 fw-bold ${n.cor ? `text-${n.cor}` : ''}`}>{numeroBR(n.valor)}</div>
              {n.dica && <div className="small text-secondary lh-sm">{n.dica}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
