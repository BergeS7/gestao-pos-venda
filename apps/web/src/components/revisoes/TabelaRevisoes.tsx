/**
 * components/revisoes/TabelaRevisoes.tsx — Tabela da fila de revisões
 *
 * Mostra uma página de revisões, com caixas de seleção para as ações em lote
 * (atribuir operadora). A seleção fica na página Revisoes.tsx; a tabela só
 * mostra o que está marcado e avisa quando o usuário marca ou desmarca.
 * Sem `onAlternar` (perfis que não organizam a fila, Etapa 9), as caixas de
 * seleção não aparecem.
 * O nome do cliente leva para a tela do cliente (/revisoes/:id, Etapa 8).
 */

import { Link } from 'react-router-dom'
import type { Revisao } from '../../lib/api.ts'
import { celularBR, diaBR, kmBR } from '../../lib/formatar.ts'
import BadgeSituacao from '../BadgeSituacao.tsx'

type Props = {
  itens: Revisao[]
  /** Ids marcados. */
  selecionados: Set<number>
  /** Marca/desmarca uma revisão. Sem ela, a tabela não mostra as caixas de seleção. */
  onAlternar?: (id: number) => void
  /** Marca todas da página (true) ou desmarca todas (false). */
  onAlternarTodos?: (marcar: boolean) => void
}

export default function TabelaRevisoes({ itens, selecionados, onAlternar, onAlternarTodos }: Props) {
  const todosMarcados = itens.length > 0 && itens.every((r) => selecionados.has(r.id))
  const selecionavel = Boolean(onAlternar && onAlternarTodos)

  if (itens.length === 0) {
    return (
      <div className="text-center text-secondary py-5">
        <i className="bi bi-inbox display-6 d-block mb-2" aria-hidden="true" />
        Nenhuma revisão encontrada com esses filtros.
      </div>
    )
  }

  return (
    // table-responsive: no celular, a tabela rola para o lado dentro do card,
    // sem estourar a largura da página
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0 tabela-fila">
        <thead>
          <tr>
            {selecionavel && (
              <th scope="col" className="col-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={todosMarcados}
                  onChange={(e) => onAlternarTodos?.(e.target.checked)}
                  aria-label="Selecionar todas desta página"
                />
              </th>
            )}
            <th scope="col">Cliente</th>
            <th scope="col">Moto</th>
            <th scope="col">Revisão</th>
            <th scope="col">Local</th>
            <th scope="col">Situação</th>
            <th scope="col">Operadora</th>
            <th scope="col">Próx. contato</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((r) => (
            <tr key={r.id} className={selecionados.has(r.id) ? 'table-active' : undefined}>
              {selecionavel && (
                <td className="col-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selecionados.has(r.id)}
                    onChange={() => onAlternar?.(r.id)}
                    aria-label={`Selecionar ${r.veiculo.cliente.nome}`}
                  />
                </td>
              )}
              <td>
                <Link to={`/revisoes/${r.id}`} className="fw-semibold link-dark">
                  {r.veiculo.cliente.nome}
                </Link>
                <div className="small text-secondary">{celularBR(r.veiculo.cliente.celular)}</div>
              </td>
              <td>
                <div>{r.veiculo.modelo}</div>
                <div className="small text-secondary font-monospace">{r.veiculo.chassi}</div>
              </td>
              <td className="text-nowrap">{kmBR(r.km)}</td>
              <td>
                <div>{r.veiculo.cliente.municipio ?? '—'}</div>
                {r.unidade && <span className="badge text-bg-light border">{r.unidade.sigla}</span>}
              </td>
              <td>
                <BadgeSituacao situacao={r.situacao} />
              </td>
              <td>{r.operador ? r.operador.nome : <span className="text-secondary fst-italic">Sem operadora</span>}</td>
              <td className="text-nowrap">{diaBR(r.proximoContato)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
