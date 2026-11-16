/**
 * components/agenda/SecaoAgenda.tsx — Uma seção da Agenda do dia
 *
 * Card com título, quantidade e uma lista compacta de clientes. Cada linha:
 *  - nome do cliente → abre a tela do cliente para registrar o contato;
 *  - celular com atalhos para ligar e para o WhatsApp;
 *  - moto, revisão e unidade;
 *  - a data que importa na seção (próximo contato ou data agendada), com
 *    um aviso de atraso quando ela já passou;
 *  - operadora (só para quem vê todas as carteiras).
 *
 * Quando a seção tem mais clientes que o limite, o rodapé leva para a fila
 * com o filtro equivalente ("ver todas na fila").
 */

import { Link } from 'react-router-dom'
import type { Revisao } from '../../lib/api.ts'
import { celularBR, celularWhatsApp, diaBR, diasAtras, kmBR, plural } from '../../lib/formatar.ts'

type Props = {
  /** Âncora da seção (os cards de resumo do topo apontam para ela). */
  id: string
  titulo: string
  /** Explica, em uma linha, o que fazer com estes clientes. */
  descricao: string
  /** Ícone do Bootstrap Icons (ex.: "bi-telephone-outbound"). */
  icone: string
  /** Cor do ícone e do contador: classe de texto do Bootstrap sem o "text-" (ex.: "danger"). */
  cor: string
  secao: { total: number; itens: Revisao[] }
  /** Qual data mostrar na coluna "Data": próximo contato ou data agendada. Sem ela, a coluna some. */
  campoData?: 'proximoContato' | 'dataAgendada'
  /** Dia da agenda (AAAA-MM-DD), para calcular o atraso. */
  hoje: string
  mostrarOperadora: boolean
  /** Link para a fila com o filtro desta seção (aparece quando há mais itens que o limite). */
  linkFila: string
  /** Texto quando não há ninguém na seção. */
  vazio: string
}

export default function SecaoAgenda({
  id,
  titulo,
  descricao,
  icone,
  cor,
  secao,
  campoData,
  hoje,
  mostrarOperadora,
  linkFila,
  vazio,
}: Props) {
  const { total, itens } = secao

  return (
    <section id={id} className="card border-0 shadow-sm mb-3 secao-agenda" aria-labelledby={`${id}-titulo`}>
      <div className="card-body">
        <div className="d-flex align-items-start gap-2 mb-2">
          <i className={`bi ${icone} text-${cor} fs-5`} aria-hidden="true" />
          <div className="flex-grow-1">
            <h2 id={`${id}-titulo`} className="h6 mb-0">
              {titulo} <span className={`badge rounded-pill text-bg-${total ? cor : 'light'} ms-1`}>{total}</span>
            </h2>
            <p className="small text-secondary mb-0">{descricao}</p>
          </div>
        </div>

        {total === 0 ? (
          <p className="small text-secondary mb-0 ps-4 ms-2">
            <i className="bi bi-check2 me-1" aria-hidden="true" />
            {vazio}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0 tabela-agenda">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Moto</th>
                  <th scope="col">Local</th>
                  {campoData && <th scope="col">{campoData === 'dataAgendada' ? 'Agendado para' : 'Ligar em'}</th>}
                  {mostrarOperadora && <th scope="col">Operadora</th>}
                </tr>
              </thead>
              <tbody>
                {itens.map((r) => {
                  const data = campoData ? r[campoData] : null
                  const atraso = data ? diasAtras(data, hoje) : 0
                  const whatsapp = celularWhatsApp(r.veiculo.cliente.celular)
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/revisoes/${r.id}`} className="fw-semibold link-dark">
                          {r.veiculo.cliente.nome}
                        </Link>
                        <div className="small text-secondary d-flex align-items-center gap-2 flex-wrap">
                          <span>{celularBR(r.veiculo.cliente.celular)}</span>
                          {whatsapp && (
                            <>
                              <a
                                href={`tel:+${whatsapp}`}
                                className="link-secondary"
                                aria-label={`Ligar para ${r.veiculo.cliente.nome}`}
                              >
                                <i className="bi bi-telephone" aria-hidden="true" />
                              </a>
                              <a
                                href={`https://wa.me/${whatsapp}`}
                                target="_blank"
                                rel="noreferrer"
                                className="link-success"
                                aria-label={`WhatsApp de ${r.veiculo.cliente.nome}`}
                              >
                                <i className="bi bi-whatsapp" aria-hidden="true" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>{r.veiculo.modelo}</div>
                        <div className="small text-secondary">Revisão de {kmBR(r.km)}</div>
                      </td>
                      <td>
                        <div>{r.veiculo.cliente.municipio ?? '—'}</div>
                        {r.unidade && <span className="badge text-bg-light border">{r.unidade.sigla}</span>}
                      </td>
                      {campoData && (
                        <td className="text-nowrap">
                          {diaBR(data)}
                          {atraso > 0 && (
                            <div>
                              <span className="badge text-bg-danger-subtle text-danger-emphasis">
                                {plural(atraso, 'dia', 'dias')} de atraso
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      {mostrarOperadora && (
                        <td>{r.operador?.nome ?? <span className="text-secondary fst-italic">Sem operadora</span>}</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > itens.length && (
          <div className="small mt-2">
            Mostrando {itens.length} de {total}. <Link to={linkFila}>Ver todos na fila</Link>
          </div>
        )}
      </div>
    </section>
  )
}
