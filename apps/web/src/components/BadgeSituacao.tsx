/**
 * BadgeSituacao.tsx — Etiqueta colorida com a situação da revisão
 *
 * As cores e os nomes ficam em lib/formatar.ts (SITUACOES), para que toda
 * a aplicação use o mesmo padrão.
 */

import type { SituacaoRevisao } from '../lib/api.ts'
import { SITUACOES } from '../lib/formatar.ts'

export default function BadgeSituacao({ situacao }: { situacao: SituacaoRevisao }) {
  const { rotulo, badge } = SITUACOES[situacao]
  return <span className={`badge ${badge}`}>{rotulo}</span>
}
