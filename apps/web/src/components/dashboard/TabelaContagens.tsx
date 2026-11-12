/**
 * components/dashboard/TabelaContagens.tsx — Tabela de produção com ranking (Etapa 10)
 *
 * Usada três vezes no Dashboard: operadora × unidade, por unidade e por
 * operadora. As colunas à esquerda (nomes) mudam; as de números são sempre
 * as mesmas (Contagem).
 *
 * Ranking: clicar no título de uma coluna ordena por ela (maior primeiro);
 * clicar de novo inverte. Taxas vazias ("—", divisor zero) ficam no fim.
 * A linha "Total geral" fica sempre embaixo, fora da ordenação.
 */

import { useState, type ReactNode } from 'react'
import type { Contagem } from '../../lib/api.ts'
import { numeroBR, porcentagem } from '../../lib/formatar.ts'

/** Colunas de números, na ordem em que aparecem. */
const COLUNAS: { campo: keyof Contagem; titulo: string; dica: string; taxa?: boolean }[] = [
  { campo: 'total', titulo: 'Total', dica: 'Total de clientes trabalhados no mês' },
  { campo: 'falou', titulo: 'Falou', dica: 'Conseguiu falar' },
  { campo: 'naoFalou', titulo: 'Não falou', dica: 'Não conseguiu falar' },
  { campo: 'agendados', titulo: 'Agend.', dica: 'Agendados' },
  { campo: 'concluidos', titulo: 'Concl.', dica: 'Concluídos' },
  { campo: 'taxaContato', titulo: '% contato', dica: 'Falou ÷ total', taxa: true },
  { campo: 'taxaAgendamento', titulo: '% agend.', dica: 'Agendados ÷ falou', taxa: true },
  { campo: 'taxaConclusao', titulo: '% concl.', dica: 'Concluídos ÷ agendados', taxa: true },
  { campo: 'taxaConcluidosBase', titulo: '% da base', dica: 'Concluídos ÷ total', taxa: true },
]

type Props<L extends Contagem> = {
  /** Título das colunas de nome (ex.: ["Operadora", "Unidade"]). */
  cabecalhos: string[]
  /** Valores das colunas de nome para uma linha. */
  nomes: (linha: L) => ReactNode[]
  /** Chave única de cada linha (para o React). */
  chave: (linha: L) => string
  linhas: L[]
  total: Contagem
  /** Texto lido por leitores de tela. */
  legenda: string
}

export default function TabelaContagens<L extends Contagem>({ cabecalhos, nomes, chave, linhas, total, legenda }: Props<L>) {
  /** Coluna da ordenação e direção. Sem coluna = ordem que veio da API (por nome). */
  const [ordem, setOrdem] = useState<{ campo: keyof Contagem; desc: boolean } | null>(null)

  function ordenarPor(campo: keyof Contagem) {
    setOrdem((atual) => (atual?.campo === campo ? { campo, desc: !atual.desc } : { campo, desc: true }))
  }

  const ordenadas = ordem
    ? [...linhas].sort((a, b) => {
        const va = a[ordem.campo]
        const vb = b[ordem.campo]
        if (va === null) return 1 // "—" sempre no fim
        if (vb === null) return -1
        return ordem.desc ? vb - va : va - vb
      })
    : linhas

  /** Texto da célula: inteiro com milhar ou porcentagem. */
  const celula = (c: Contagem, campo: keyof Contagem, taxa?: boolean) =>
    taxa ? porcentagem(c[campo]) : numeroBR(c[campo] as number)

  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover align-middle mb-0 tabela-producao" aria-label={legenda}>
        <thead>
          <tr>
            {cabecalhos.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
            {COLUNAS.map((col) => {
              const ativa = ordem?.campo === col.campo
              return (
                <th
                  key={col.campo}
                  scope="col"
                  className="text-end"
                  aria-sort={ativa ? (ordem.desc ? 'descending' : 'ascending') : undefined}
                >
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-reset fw-semibold text-decoration-none text-nowrap"
                    title={`${col.dica}. Clique para ordenar.`}
                    onClick={() => ordenarPor(col.campo)}
                  >
                    {col.titulo}
                    <i
                      className={`bi ms-1 ${ativa ? (ordem.desc ? 'bi-sort-down' : 'bi-sort-up') : 'bi-arrow-down-up opacity-25'}`}
                      aria-hidden="true"
                    />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l) => (
            <tr key={chave(l)}>
              {nomes(l).map((n, i) => (
                <td key={i} className="text-nowrap">
                  {n}
                </td>
              ))}
              {COLUNAS.map((col) => (
                <td key={col.campo} className="text-end">
                  {celula(l, col.campo, col.taxa)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="fw-bold">
            <td colSpan={cabecalhos.length}>Total geral</td>
            {COLUNAS.map((col) => (
              <td key={col.campo} className="text-end">
                {celula(total, col.campo, col.taxa)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
