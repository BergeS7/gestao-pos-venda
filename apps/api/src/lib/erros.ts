/**
 * lib/erros.ts — Erros HTTP padronizados
 *
 * Os serviços lançam `ErroHttp` quando algo é culpa da requisição
 * (ex.: operadora inexistente → 404). O tratador de erros do app.ts
 * transforma esse erro na resposta com o status certo.
 *
 * Assim os serviços não precisam conhecer o Express, e todas as respostas
 * de erro da API têm o mesmo formato:
 *   { "error": "mensagem legível", "detalhes": { ... opcional } }
 */

/** Erro com status HTTP, seguro para mostrar ao usuário. */
export class ErroHttp extends Error {
  /**
   * @param status   Código HTTP (400 dados inválidos, 404 não encontrado, 409 conflito...)
   * @param mensagem Texto exibido ao usuário. Não coloque detalhes internos aqui.
   * @param detalhes Informações extras (ex.: quais campos estão inválidos).
   */
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = "ErroHttp";
  }
}
