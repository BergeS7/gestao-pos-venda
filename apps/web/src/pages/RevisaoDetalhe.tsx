/**
 * pages/RevisaoDetalhe.tsx — Tela do cliente (Etapa 8)
 *
 * Aberta ao clicar no nome do cliente na fila (/revisoes/:id). Mostra:
 *  - dados do cliente, da moto e da revisão (com atalhos para ligar e WhatsApp);
 *  - o formulário "Registrar contato" (as perguntas da planilha);
 *  - a linha do tempo de todas as ligações já feitas;
 *  - o botão "Marcar como concluída" (revisão feita na oficina) ou "Reabrir".
 *
 * PROTEÇÃO CONTRA SOBRESCRITA: toda gravação envia a `versao` da revisão que
 * está na tela. Se outra pessoa gravou antes (outra aba, outro computador),
 * a API responde 409 e NADA é gravado. A tela avisa e oferece "Recarregar".
 * O que já foi digitado no formulário é mantido, para não ser perdido.
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import BadgeSituacao from '../components/BadgeSituacao.tsx'
import FormContato from '../components/atendimentos/FormContato.tsx'
import HistoricoContatos from '../components/atendimentos/HistoricoContatos.tsx'
import {
  apiEnviar,
  apiGet,
  codigoDoErro,
  CODIGO_VERSAO_DESATUALIZADA,
  errosDosCampos,
  type Motivo,
  type NovaTentativa,
  type RevisaoDetalhe as Detalhe,
} from '../lib/api.ts'
import { celularBR, celularWhatsApp, dataBR, diaBR, kmBR } from '../lib/formatar.ts'

/** Resultado da última busca, marcado com a chave (id + recarga) que o gerou. */
type Resultado = { chave: string; dados?: Detalhe; erro?: string; status?: number }

/** Mensagem de retorno de uma ação. `recarregar` mostra o botão para buscar a versão nova. */
type Aviso = { tipo: 'success' | 'danger' | 'warning'; texto: string; recarregar?: boolean }

export default function RevisaoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // -------------------------------------------------------------------------
  // Carregamento
  // -------------------------------------------------------------------------
  const [recarga, setRecarga] = useState(0)
  const chave = `${id}:${recarga}`
  const [resultado, setResultado] = useState<Resultado>()
  const carregando = resultado?.chave !== chave
  /** Dados em tela. Durante uma recarga, continua mostrando os anteriores. */
  const dados = resultado?.dados

  useEffect(() => {
    const controle = new AbortController()
    apiGet<Detalhe>(`/revisoes/${id}`, controle.signal)
      .then((dados) => setResultado({ chave, dados }))
      .catch((e: Error & { status?: number }) => {
        if (e.name !== 'AbortError') setResultado({ chave, erro: e.message, status: e.status })
      })
    return () => controle.abort()
  }, [id, chave])

  // Motivos: lista fixa, carregada uma vez
  const [motivos, setMotivos] = useState<Motivo[]>([])
  useEffect(() => {
    apiGet<Motivo[]>('/motivos')
      .then(setMotivos)
      .catch(() => {
        /* sem motivos o formulário avisa ao validar; a falha de conexão já aparece na página */
      })
  }, [])

  // -------------------------------------------------------------------------
  // Ações
  // -------------------------------------------------------------------------
  const [aviso, setAviso] = useState<Aviso>()
  const [enviando, setEnviando] = useState(false)
  const [errosApi, setErrosApi] = useState<Record<string, string[]>>({})
  /** Muda a cada contato salvo: recria o formulário em branco. */
  const [salvos, setSalvos] = useState(0)

  /**
   * Envia uma gravação e trata as respostas: sucesso troca os dados da tela
   * pelos que a API devolveu; 409 avisa que alguém alterou antes.
   */
  async function gravar(acao: () => Promise<Detalhe>, sucesso: string) {
    setEnviando(true)
    setAviso(undefined)
    setErrosApi({})
    try {
      const novos = await acao()
      setResultado({ chave, dados: novos })
      setAviso({ tipo: 'success', texto: sucesso })
      return true
    } catch (e) {
      setErrosApi(errosDosCampos(e))
      const desatualizada = codigoDoErro(e) === CODIGO_VERSAO_DESATUALIZADA
      setAviso({ tipo: desatualizada ? 'warning' : 'danger', texto: (e as Error).message, recarregar: desatualizada })
      return false
    } finally {
      setEnviando(false)
    }
  }

  async function registrar(tentativa: NovaTentativa) {
    const ok = await gravar(
      () => apiEnviar<Detalhe>('POST', `/revisoes/${id}/tentativas`, tentativa),
      'Contato registrado.',
    )
    if (ok) setSalvos((n) => n + 1)
  }

  function concluir(concluida: boolean) {
    if (!dados) return
    void gravar(
      () => apiEnviar<Detalhe>('PATCH', `/revisoes/${id}/concluir`, { versao: dados.versao, concluida }),
      concluida ? 'Revisão marcada como concluída.' : 'Revisão reaberta.',
    )
  }

  function recarregar() {
    setAviso(undefined)
    setRecarga((n) => n + 1)
  }

  /** Volta para a fila mantendo os filtros (histórico do navegador), ou abre a fila limpa. */
  function voltar() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/revisoes')
  }

  // -------------------------------------------------------------------------
  // Tela
  // -------------------------------------------------------------------------

  const botaoVoltar = (
    <button type="button" className="btn btn-link px-0 mb-2" onClick={voltar}>
      <i className="bi bi-arrow-left me-1" aria-hidden="true" /> Voltar para a fila
    </button>
  )

  if (!dados) {
    if (carregando) {
      return (
        <div className="text-center text-secondary py-5">
          <span className="spinner-border" role="status" aria-label="Carregando" />
        </div>
      )
    }
    return (
      <>
        {botaoVoltar}
        <div className="alert alert-danger">
          {resultado?.status === 404 ? 'Revisão não encontrada.' : resultado?.erro}{' '}
          <Link to="/revisoes">Ir para a fila</Link>
        </div>
      </>
    )
  }

  const { veiculo, unidade, operador } = dados
  const { cliente } = veiculo
  const whatsapp = celularWhatsApp(cliente.celular)

  return (
    <>
      {botaoVoltar}

      <div className="page-header d-flex flex-wrap align-items-center gap-2">
        <h1 className="mb-0 me-2">{cliente.nome}</h1>
        <span className="badge text-bg-light border fs-6">{kmBR(dados.km)}</span>
        <BadgeSituacao situacao={dados.situacao} />
        {carregando && <span className="spinner-border spinner-border-sm text-secondary" aria-label="Atualizando" />}
      </div>

      {aviso && (
        <div className={`alert alert-${aviso.tipo} d-flex flex-wrap align-items-center gap-2`} role="status">
          <span className="me-auto">{aviso.texto}</span>
          {aviso.recarregar && (
            <button type="button" className="btn btn-sm btn-warning" onClick={recarregar}>
              <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" /> Recarregar
            </button>
          )}
          <button type="button" className="btn-close" onClick={() => setAviso(undefined)} aria-label="Fechar aviso" />
        </div>
      )}

      <div className="row g-3">
        {/* Coluna da esquerda: dados */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h2 className="h6 mb-3">
                <i className="bi bi-person me-2 text-primary" aria-hidden="true" /> Cliente
              </h2>
              <dl className="dados-lista mb-0">
                <dt>Celular</dt>
                <dd>
                  {celularBR(cliente.celular)}
                  {cliente.celular && (
                    <span className="ms-2 d-inline-flex gap-1">
                      <a className="btn btn-sm btn-outline-secondary" href={`tel:${cliente.celular}`} aria-label="Ligar">
                        <i className="bi bi-telephone" aria-hidden="true" />
                      </a>
                      {whatsapp && (
                        <a
                          className="btn btn-sm btn-outline-success"
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir conversa no WhatsApp"
                        >
                          <i className="bi bi-whatsapp" aria-hidden="true" />
                        </a>
                      )}
                    </span>
                  )}
                </dd>
                <dt>Município</dt>
                <dd>{cliente.municipio ?? '—'}</dd>
              </dl>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h2 className="h6 mb-3">
                <i className="bi bi-bicycle me-2 text-primary" aria-hidden="true" /> Moto
              </h2>
              <dl className="dados-lista mb-0">
                <dt>Modelo</dt>
                <dd>{veiculo.modelo}</dd>
                <dt>Chassi</dt>
                <dd className="font-monospace">{veiculo.chassi}</dd>
                <dt>Cor</dt>
                <dd>{veiculo.cor ?? '—'}</dd>
                <dt>Data da venda</dt>
                <dd>{dataBR(veiculo.dataVenda)}</dd>
              </dl>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h6 mb-3">
                <i className="bi bi-tools me-2 text-primary" aria-hidden="true" /> Revisão
              </h2>
              <dl className="dados-lista">
                <dt>Unidade</dt>
                <dd>{unidade ? `${unidade.sigla} · ${unidade.nome}` : '—'}</dd>
                <dt>Operadora</dt>
                <dd>{operador?.nome ?? <span className="text-secondary fst-italic">Sem operadora</span>}</dd>
                <dt>Data agendada</dt>
                <dd>{diaBR(dados.dataAgendada)}</dd>
                <dt>Próximo contato</dt>
                <dd>{diaBR(dados.proximoContato)}</dd>
              </dl>
              {dados.concluida ? (
                <button type="button" className="btn btn-outline-secondary" disabled={enviando} onClick={() => concluir(false)}>
                  <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" /> Reabrir revisão
                </button>
              ) : (
                <button type="button" className="btn btn-success" disabled={enviando} onClick={() => concluir(true)}>
                  <i className="bi bi-check2-circle me-1" aria-hidden="true" /> Marcar como concluída
                </button>
              )}
              <div className="form-text">Concluída = a revisão foi feita na oficina.</div>
            </div>
          </div>
        </div>

        {/* Coluna da direita: registrar + histórico */}
        <div className="col-lg-7 d-flex flex-column gap-3">
          {dados.concluida ? (
            <div className="alert alert-success mb-0">
              <i className="bi bi-check2-circle me-2" aria-hidden="true" />
              Revisão concluída. Para registrar um novo contato, reabra a revisão.
            </div>
          ) : (
            <FormContato
              key={salvos}
              motivos={motivos}
              versao={dados.versao}
              enviando={enviando}
              errosApi={errosApi}
              onEnviar={registrar}
            />
          )}
          <HistoricoContatos tentativas={dados.tentativas} />
        </div>
      </div>
    </>
  )
}
