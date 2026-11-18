/**
 * components/importacao/TabelaImportacao.tsx — Tabelas da prévia de importação (Etapa 6)
 *
 *  - TabelaLinhas: linhas da lista de revisões (elegíveis, com OS, duplicadas...),
 *    com a linha do arquivo, para a pessoa achar no Excel;
 *  - TabelaInvalidas: linhas recusadas e os motivos.
 *
 * As listas vêm limitadas a 300 itens pela API; o total completo está nos cards.
 */

import type { LinhaImportada, LinhaInvalida } from '../../lib/api.ts'
import { celularBR, diaBR, kmBR, plural } from '../../lib/formatar.ts'

/** Aviso de lista cortada (a API manda no máximo 300 de cada). */
function Corte({ mostradas, total }: { mostradas: number; total: number }) {
  if (total <= mostradas) return null
  return (
    <p className="small text-secondary mt-2 mb-0">
      Mostrando {mostradas} de {plural(total, 'linha', 'linhas')}.
    </p>
  )
}

type PropsLinhas = {
  linhas: (LinhaImportada & { tipoOs?: string })[]
  total: number
  /** Mostra a coluna "Tipo de OS" (lista dos que saíram por ter OS). */
  comTipoOs?: boolean
  vazio: string
}

export function TabelaLinhas({ linhas, total, comTipoOs, vazio }: PropsLinhas) {
  if (linhas.length === 0) return <p className="text-secondary small mb-0">{vazio}</p>
  return (
    <>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0 small">
          <thead>
            <tr>
              <th scope="col">Linha</th>
              <th scope="col">Cliente</th>
              <th scope="col">Chassi</th>
              <th scope="col">Modelo</th>
              <th scope="col">Revisão</th>
              <th scope="col">Município</th>
              <th scope="col">Unidade</th>
              {comTipoOs ? <th scope="col">Tipo de OS</th> : <th scope="col">Celular / venda</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={`${l.numero}-${l.chassi}-${l.km}`}>
                <td className="text-secondary">{l.numero}</td>
                <td>
                  {l.nome}
                  {l.avisos.map((a) => (
                    <div key={a} className="text-warning-emphasis">
                      <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                      {a}
                    </div>
                  ))}
                </td>
                <td className="font-monospace">{l.chassi}</td>
                <td>{l.modelo}</td>
                <td className="text-nowrap">{kmBR(l.km)}</td>
                <td>{l.municipio ?? '—'}</td>
                <td>{l.unidade ?? <span className="badge text-bg-warning">sem unidade</span>}</td>
                {comTipoOs ? (
                  <td>{l.tipoOs}</td>
                ) : (
                  <td className="text-nowrap">
                    {celularBR(l.celular) || '—'}
                    <div className="text-secondary">{diaBR(l.dataVenda)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Corte mostradas={linhas.length} total={total} />
    </>
  )
}

export function TabelaInvalidas({ linhas, total }: { linhas: LinhaInvalida[]; total: number }) {
  if (linhas.length === 0) return <p className="text-secondary small mb-0">Nenhuma linha recusada.</p>
  return (
    <>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0 small">
          <thead>
            <tr>
              <th scope="col">Linha</th>
              <th scope="col">Chassi</th>
              <th scope="col">Cliente</th>
              <th scope="col">Por que foi recusada</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.numero}>
                <td className="text-secondary">{l.numero}</td>
                <td className="font-monospace">{l.chassi ?? '—'}</td>
                <td>{l.nome ?? '—'}</td>
                <td className="text-danger">{l.motivos.join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Corte mostradas={linhas.length} total={total} />
    </>
  )
}
