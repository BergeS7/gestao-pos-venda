/**
 * lib/api.ts — Comunicação do frontend com a API
 *
 * Toda chamada HTTP à API passa por aqui, em vez de usar `fetch` espalhado
 * pelas páginas. Vantagens:
 *  - um só lugar para tratar erros, autenticação (Etapa 9) etc.;
 *  - os tipos das respostas ficam declarados junto das chamadas.
 *
 * Os caminhos são relativos (/api/...). Em desenvolvimento, o proxy do Vite
 * (vite.config.ts) repassa essas chamadas para a API na porta 3333.
 *
 * Os tipos abaixo espelham o que a API devolve (apps/api/src/services e routes).
 * Ao mudar uma resposta na API, atualize o tipo correspondente aqui.
 */

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

/**
 * Erro devolvido pela API. `message` já vem em português, pronta para exibir
 * (a API usa o formato { error, detalhes }; ver apps/api/src/lib/erros.ts).
 */
export class ErroApi extends Error {
  /** Código HTTP da resposta (400, 404, 500...). */
  readonly status: number
  /** Informações extras da API (ex.: campos inválidos). */
  readonly detalhes?: unknown

  // Propriedades declaradas acima, e não no construtor ("public readonly x"),
  // porque o tsconfig do frontend usa erasableSyntaxOnly
  constructor(status: number, mensagem: string, detalhes?: unknown) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.detalhes = detalhes
  }
}

/** Transforma uma resposta HTTP em JSON tipado, ou lança ErroApi. */
async function tratarResposta<T>(res: Response, path: string): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  // Tenta ler a mensagem da API; se não vier JSON (API fora do ar), usa uma genérica
  const corpo = (await res.json().catch(() => null)) as { error?: string; detalhes?: unknown } | null
  throw new ErroApi(res.status, corpo?.error ?? `Erro ${res.status} ao chamar /api${path}`, corpo?.detalhes)
}

// ---------------------------------------------------------------------------
// Chamadas
// ---------------------------------------------------------------------------

/**
 * Faz um GET na API e devolve o JSON da resposta já tipado.
 *
 * @param path Caminho depois de /api, começando com barra. Ex.: "/health".
 * @param signal Permite cancelar a requisição (ex.: o usuário mudou o filtro antes da resposta chegar).
 * @throws ErroApi se a API responder com erro (4xx/5xx) ou estiver fora do ar.
 *
 * @example
 *   const saude = await apiGet<Health>('/health')
 */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, { signal })
  return tratarResposta<T>(res, path)
}

/**
 * Envia dados para a API (POST, PATCH, PUT ou DELETE) em JSON.
 *
 * @example
 *   await apiEnviar('PATCH', '/revisoes/atribuir', { ids: [1, 2], operadorId: 3 })
 */
export async function apiEnviar<T>(
  metodo: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  corpo?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  return tratarResposta<T>(res, path)
}

/**
 * Monta a query string a partir de um objeto, ignorando valores vazios.
 * Ex.: { unidade: 'STI', km: '' } → "?unidade=STI"
 */
export function montarQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== '') q.set(chave, String(valor))
  }
  const texto = q.toString()
  return texto ? `?${texto}` : ''
}

// ---------------------------------------------------------------------------
// Tipos das respostas
// ---------------------------------------------------------------------------

/** Resposta de GET /api/health (ver apps/api/src/routes/health.ts). */
export type Health = {
  /** Sempre true quando a API responde. */
  ok: boolean
  /** Nome do serviço que respondeu. */
  service: string
  /** Hora do servidor, ISO 8601 (UTC). */
  timestamp: string
}

/** Situações da fila (enum SituacaoRevisao do schema.prisma). */
export type SituacaoRevisao =
  | 'PENDENTE'
  | 'RETORNAR'
  | 'AGENDADO'
  | 'NAO_AGENDADO'
  | 'BUSCAR_CONTATO'
  | 'CONCLUIDA'

/** Uma revisão da fila, como devolvida por GET /api/revisoes. Datas chegam como texto ISO. */
export type Revisao = {
  id: number
  km: number
  situacao: SituacaoRevisao
  dataAgendada: string | null
  proximoContato: string | null
  concluida: boolean
  /** Controle de concorrência: muda a cada alteração da revisão. */
  versao: number
  veiculo: {
    chassi: string
    modelo: string
    cor: string | null
    dataVenda: string | null
    cliente: { id: number; nome: string; celular: string | null; municipio: string | null }
  }
  unidade: { sigla: string; nome: string } | null
  operador: { id: number; nome: string } | null
}

/** Resposta paginada de GET /api/revisoes. */
export type ListaRevisoes = {
  itens: Revisao[]
  total: number
  pagina: number
  porPagina: number
  totalPaginas: number
}

/** GET /api/unidades */
export type Unidade = { id: number; sigla: string; nome: string }

/** GET /api/operadoras */
export type Operadora = { id: number; nome: string; unidade: { sigla: string } | null }

/** PATCH /api/revisoes/atribuir */
export type ResultadoAtribuir = { atualizadas: number }

/** POST /api/revisoes/distribuir */
export type ResultadoDistribuir = {
  distribuidas: number
  porOperadora: { operadorId: number; quantidade: number }[]
}

// ---------------------------------------------------------------------------
// Atendimentos (Etapa 8)
// ---------------------------------------------------------------------------

/** Resposta "Agendou?" (enum ResultadoContato do schema.prisma). */
export type ResultadoContato = 'SIM' | 'NAO' | 'RETORNAR'

/** Para onde a revisão vai com este motivo (enum AcaoMotivo do schema.prisma). */
export type AcaoMotivo = 'RETORNAR' | 'BUSCAR_CONTATO' | 'ENCERRAR'

/** GET /api/motivos */
export type Motivo = { id: number; descricao: string; acao: AcaoMotivo }

/** Uma ligação do histórico. Datas "só dia" chegam como "AAAA-MM-DDT00:00:00.000Z". */
export type Tentativa = {
  id: number
  /** Data e hora do registro (ISO, UTC). */
  criadoEm: string
  conseguiuFalar: boolean
  resultado: ResultadoContato
  dataAgendada: string | null
  proximoContato: string | null
  observacoes: string | null
  motivo: { id: number; descricao: string } | null
  usuario: { id: number; nome: string } | null
}

/** GET /api/revisoes/:id — a revisão com o histórico (mais nova primeiro). */
export type RevisaoDetalhe = Revisao & { tentativas: Tentativa[] }

/** Corpo de POST /api/revisoes/:id/tentativas. Datas no formato "AAAA-MM-DD". */
export type NovaTentativa = {
  versao: number
  conseguiuFalar: boolean
  resultado: ResultadoContato
  motivoId?: number | null
  dataAgendada?: string
  proximoContato?: string
  observacoes?: string
}

/** Código que a API manda em `detalhes.codigo` quando outra pessoa alterou a revisão antes. */
export const CODIGO_VERSAO_DESATUALIZADA = 'VERSAO_DESATUALIZADA'

/** Mensagens por campo que a API devolve num erro 400 (`detalhes.campos`). */
export function errosDosCampos(erro: unknown): Record<string, string[]> {
  if (!(erro instanceof ErroApi) || erro.status !== 400) return {}
  const detalhes = erro.detalhes as { campos?: Record<string, string[]> } | undefined
  return detalhes?.campos ?? {}
}

/** Código do erro (`detalhes.codigo`), se a API mandou um. */
export function codigoDoErro(erro: unknown): string | undefined {
  if (!(erro instanceof ErroApi)) return undefined
  return (erro.detalhes as { codigo?: string } | undefined)?.codigo
}
