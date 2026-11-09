// Cliente simples para a API. Em desenvolvimento, o Vite encaminha /api para a porta 3333.
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao chamar /api${path}`)
  }
  return res.json() as Promise<T>
}

export type Health = {
  ok: boolean
  service: string
  timestamp: string
}
