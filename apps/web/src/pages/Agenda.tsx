/**
 * pages/Agenda.tsx — Agenda do dia
 *
 * A tela de trabalho da operadora: "o que eu preciso fazer hoje?".
 * Substitui a antiga página "Atendimentos" (que só dizia "em construção";
 * o registro de contato em si fica na tela do cliente, /revisoes/:id).
 *
 * Mostra, de GET /api/revisoes/agenda (regras em apps/api/src/services/agenda.ts):
 *  - cards de resumo com a quantidade de cada seção (clicar leva até ela);
 *  - Ligar hoje: retornos marcados para hoje e os atrasados;
 *  - Vêm hoje à oficina: agendados para hoje;
 *  - Agendados que ainda não vieram: confirmar se vieram (concluir) ou remarcar;
 *  - Buscar contato: telefone não funciona;
 *  - Ainda sem contato: ninguém ligou.
 *
 * Por perfil: a OPERADORA vê só a própria carteira (a API garante). Gestor,
 * Diretoria e Admin veem todas e podem filtrar por operadora e unidade.
 * Os filtros ficam na URL, como na fila e no Dashboard.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/contexto.ts'
import PageHeader from '../components/PageHeader.tsx'
import SecaoAgenda from '../components/agenda/SecaoAgenda.tsx'
import { apiGet, montarQuery, type Agenda, type ChaveSecaoAgenda, type Operadora, type Unidade } from '../lib/api.ts'
import { diaPorExtenso, plural } from '../lib/formatar.ts'
import { pode } from '../lib/permissoes.ts'

/** Textos e aparência de cada seção, na ordem da tela. */
const SECOES: {
  chave: ChaveSecaoAgenda
  titulo: string
  resumo: string
  descricao: string
  icone: string
  cor: string
  campoData?: 'proximoContato' | 'dataAgendada'
  /** Filtro de situação da fila equivalente a esta seção ("ver todos na fila"). */
  situacao: string
  vazio: string
}[] = [
  {
    chave: 'ligarHoje',
    titulo: 'Ligar hoje',
    resumo: 'Ligar hoje',
    descricao: 'Retornos marcados para hoje e os que ficaram para trás. Os mais atrasados vêm primeiro.',
    icone: 'bi-telephone-outbound',
    cor: 'danger',
    campoData: 'proximoContato',
    situacao: 'RETORNAR',
    vazio: 'Nenhum retorno para hoje.',
  },
  {
    chave: 'agendadosHoje',
    titulo: 'Vêm hoje à oficina',
    resumo: 'Vêm hoje',
    descricao: 'Clientes com revisão agendada para hoje. Quando a revisão for feita, marque como concluída.',
    icone: 'bi-calendar-check',
    cor: 'success',
    campoData: 'dataAgendada',
    situacao: 'AGENDADO',
    vazio: 'Nenhum cliente agendado para hoje.',
  },
  {
    chave: 'agendadosPassados',
    titulo: 'Agendados que ainda não vieram',
    resumo: 'Não vieram',
    descricao:
      'A data agendada já passou e a revisão não foi concluída. Confira se o cliente veio ou ligue para remarcar.',
    icone: 'bi-calendar-x',
    cor: 'warning',
    campoData: 'dataAgendada',
    situacao: 'AGENDADO',
    vazio: 'Nenhum agendamento pendente de confirmação.',
  },
  {
    chave: 'buscarContato',
    titulo: 'Buscar contato',
    resumo: 'Buscar contato',
    descricao: 'O telefone não funciona. Procure outro número (cadastro da loja, vendedor, redes sociais).',
    icone: 'bi-search',
    cor: 'secondary',
    campoData: 'proximoContato',
    situacao: 'BUSCAR_CONTATO',
    vazio: 'Nenhum cliente para buscar contato.',
  },
  {
    chave: 'semContato',
    titulo: 'Ainda sem contato',
    resumo: 'Sem contato',
    descricao: 'Ninguém ligou para estes clientes ainda.',
    icone: 'bi-person-plus',
    cor: 'primary',
    situacao: 'PENDENTE',
    vazio: 'Todos os clientes já receberam pelo menos uma ligação.',
  },
]

/** Resultado da consulta, marcado com os filtros a que pertence. */
type Resultado = { chave: string } & ({ agenda: Agenda } | { erro: string })

export default function AgendaDoDia() {
  const { usuario } = useAuth()
  const verTodas = pode(usuario, 'verTodasCarteiras')

  // Filtros na URL
  const [params, setParams] = useSearchParams()
  const unidade = params.get('unidade') ?? ''
  const operador = verTodas ? (params.get('operador') ?? '') : ''
  function mudarFiltro(campo: 'unidade' | 'operador', valor: string) {
    setParams((atual) => {
      const novo = new URLSearchParams(atual)
      if (valor) novo.set(campo, valor)
      else novo.delete(campo)
      return novo
    })
  }

  // Catálogos dos filtros
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [operadoras, setOperadoras] = useState<Operadora[]>([])
  useEffect(() => {
    Promise.all([apiGet<Unidade[]>('/unidades'), verTodas ? apiGet<Operadora[]>('/operadoras') : Promise.resolve([])])
      .then(([u, o]) => {
        setUnidades(u)
        setOperadoras(o)
      })
      .catch(() => {
        /* a agenda já mostra o erro de conexão */
      })
  }, [verTodas])

  // Agenda
  const chave = montarQuery({ unidade, operador })
  const [resultado, setResultado] = useState<Resultado>()
  const carregando = resultado?.chave !== chave
  useEffect(() => {
    const controle = new AbortController()
    apiGet<Agenda>(`/revisoes/agenda${chave}`, controle.signal)
      .then((agenda) => setResultado({ chave, agenda }))
      .catch((e: Error) => {
        if (!controle.signal.aborted) setResultado({ chave, erro: e.message })
      })
    return () => controle.abort()
  }, [chave])

  const agenda = resultado && 'agenda' in resultado ? resultado.agenda : undefined

  /** Link para a fila com o filtro de uma seção (mais a unidade e a operadora atuais). */
  const linkFila = (situacao: string) => `/revisoes${montarQuery({ situacao, unidade, operador })}`

  return (
    <>
      <PageHeader
        title="Agenda do dia"
        subtitle={
          agenda
            ? `${diaPorExtenso(agenda.hoje)} · ${verTodas ? 'todas as carteiras' : 'sua carteira'}`
            : 'O que fazer hoje'
        }
      />

      {/* Filtros (só para quem vê todas as carteiras) */}
      {verTodas && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-6 col-lg-3">
                <label htmlFor="a-unidade" className="form-label small mb-1">
                  Unidade
                </label>
                <select
                  id="a-unidade"
                  className="form-select"
                  value={unidade}
                  onChange={(e) => mudarFiltro('unidade', e.target.value)}
                >
                  <option value="">Todas</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.sigla}>
                      {u.sigla} — {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-lg-3">
                <label htmlFor="a-operador" className="form-label small mb-1">
                  Operadora
                </label>
                <select
                  id="a-operador"
                  className="form-select"
                  value={operador}
                  onChange={(e) => mudarFiltro('operador', e.target.value)}
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
            </div>
          </div>
        </div>
      )}

      {carregando && !agenda && (
        <div className="text-secondary py-4">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> Montando a agenda…
        </div>
      )}

      {resultado && 'erro' in resultado && !carregando && (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar a agenda. {resultado.erro}
        </div>
      )}

      {agenda && (
        <div className={carregando ? 'opacity-50' : undefined} aria-busy={carregando}>
          {/* Resumo: um card por seção; clicar rola até ela */}
          <div className="row g-2 mb-3">
            {SECOES.map((s) => (
              <div key={s.chave} className="col-6 col-md-4 col-xl">
                <a href={`#${s.chave}`} className="card border-0 shadow-sm h-100 text-decoration-none resumo-agenda">
                  <div className="card-body py-2 px-3">
                    <div className="small text-secondary text-truncate">
                      <i className={`bi ${s.icone} text-${s.cor} me-1`} aria-hidden="true" />
                      {s.resumo}
                    </div>
                    <div className="fs-4 fw-bold text-body">{agenda.secoes[s.chave].total}</div>
                  </div>
                </a>
              </div>
            ))}
          </div>

          {SECOES.map((s) => (
            <SecaoAgenda
              key={s.chave}
              id={s.chave}
              titulo={s.titulo}
              descricao={s.descricao}
              icone={s.icone}
              cor={s.cor}
              secao={agenda.secoes[s.chave]}
              campoData={s.campoData}
              hoje={agenda.hoje}
              mostrarOperadora={verTodas}
              linkFila={linkFila(s.situacao)}
              vazio={s.vazio}
            />
          ))}

          <p className="small text-secondary mb-0">
            <i className="bi bi-calendar-week me-1" aria-hidden="true" />
            Próximos 7 dias: {plural(agenda.proximosDias, 'retorno marcado', 'retornos marcados')}.
          </p>
        </div>
      )}
    </>
  )
}
