/**
 * components/revisoes/FiltrosRevisoes.tsx — Barra de filtros da fila de revisões
 *
 * Componente "controlado": não guarda estado próprio. Recebe os valores
 * atuais e avisa a página (onMudar) quando algo muda. Quem decide o que
 * fazer, que é atualizar a URL e recarregar a lista, é a página Revisoes.tsx.
 *
 * Exceção: o campo de busca recebe o texto digitado (`busca`) separado dos
 * filtros, porque a página espera o usuário parar de digitar antes de buscar.
 */

import type { Operadora, SituacaoRevisao, Unidade } from '../../lib/api.ts'
import { KMS_REVISAO, SITUACOES, kmBR } from '../../lib/formatar.ts'
import type { FiltrosFila } from './tipos.ts'

type Props = {
  filtros: FiltrosFila
  /** Texto do campo de busca (atualiza a cada tecla). */
  busca: string
  unidades: Unidade[]
  operadoras: Operadora[]
  onBusca: (texto: string) => void
  onMudar: (campo: keyof FiltrosFila, valor: string) => void
  onLimpar: () => void
}

export default function FiltrosRevisoes({ filtros, busca, unidades, operadoras, onBusca, onMudar, onLimpar }: Props) {
  const temFiltro = busca !== '' || Object.values(filtros).some((v) => v !== '')

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body">
        <div className="row g-2 align-items-end">
          {/* Busca livre */}
          <div className="col-12">
            <label htmlFor="f-busca" className="form-label small mb-1">
              Buscar
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-search" aria-hidden="true" />
              </span>
              <input
                id="f-busca"
                type="search"
                className="form-control"
                placeholder="Nome, chassi ou celular"
                value={busca}
                onChange={(e) => onBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-4 col-xl">
            <label htmlFor="f-unidade" className="form-label small mb-1">
              Unidade
            </label>
            <select
              id="f-unidade"
              className="form-select"
              value={filtros.unidade}
              onChange={(e) => onMudar('unidade', e.target.value)}
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.sigla}>
                  {u.sigla} · {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-4 col-xl">
            <label htmlFor="f-operador" className="form-label small mb-1">
              Operadora
            </label>
            <select
              id="f-operador"
              className="form-select"
              value={filtros.operador}
              onChange={(e) => onMudar('operador', e.target.value)}
            >
              <option value="">Todas</option>
              <option value="sem">Sem operadora</option>
              {operadoras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-4 col-xl">
            <label htmlFor="f-km" className="form-label small mb-1">
              Revisão
            </label>
            <select id="f-km" className="form-select" value={filtros.km} onChange={(e) => onMudar('km', e.target.value)}>
              <option value="">Todas</option>
              {KMS_REVISAO.map((km) => (
                <option key={km} value={km}>
                  {kmBR(km)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-4 col-xl">
            <label htmlFor="f-situacao" className="form-label small mb-1">
              Situação
            </label>
            <select
              id="f-situacao"
              className="form-select"
              value={filtros.situacao}
              onChange={(e) => onMudar('situacao', e.target.value)}
            >
              <option value="">Todas</option>
              {(Object.keys(SITUACOES) as SituacaoRevisao[]).map((s) => (
                <option key={s} value={s}>
                  {SITUACOES[s].rotulo}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-4 col-xl">
            <label htmlFor="f-mes" className="form-label small mb-1">
              Mês venda
            </label>
            <input
              id="f-mes"
              type="month"
              className="form-control"
              value={filtros.mesVenda}
              onChange={(e) => onMudar('mesVenda', e.target.value)}
            />
          </div>
        </div>

        {temFiltro && (
          <button type="button" className="btn btn-link btn-sm px-0 mt-2" onClick={onLimpar}>
            <i className="bi bi-x-circle me-1" aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
