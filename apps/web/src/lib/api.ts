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
 */

/**
 * Faz um GET na API e devolve o JSON da resposta já tipado.
 *
 * @param path Caminho depois de /api, começando com barra. Ex.: "/health".
 * @throws Error se a API responder com status de erro (4xx/5xx) ou estiver fora do ar.
 *
 * @example
 *   const saude = await apiGet<Health>('/health')
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao chamar /api${path}`)
  }
  return res.json() as Promise<T>
}

/** Resposta de GET /api/health (ver apps/api/src/routes/health.ts). */
export type Health = {
  /** Sempre true quando a API responde. */
  ok: boolean
  /** Nome do serviço que respondeu. */
  service: string
  /** Hora do servidor, ISO 8601 (UTC). */
  timestamp: string
}
