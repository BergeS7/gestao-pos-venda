/**
 * lib/validar.ts — Validação de entrada com zod
 *
 * Toda entrada que vem de fora (query string, corpo da requisição) passa por
 * um "schema" zod antes de chegar ao serviço. O zod:
 *  - confere tipos e formatos (ex.: km precisa ser 1000, 6000, 12000 ou 18000);
 *  - converte valores (ex.: "20" da URL vira o número 20);
 *  - devolve os dados já TIPADOS para o TypeScript.
 *
 * Se algo estiver inválido, `validar` lança ErroHttp 400 com a lista dos
 * campos com problema, e a requisição não segue adiante.
 *
 * Documentação do zod: https://zod.dev
 */

import { z } from "zod";
import { ErroHttp } from "./erros.js";

/**
 * Valida `dados` com o `schema` e devolve o resultado tipado.
 *
 * @throws ErroHttp 400 com `detalhes` = { campo: ["mensagem", ...] }
 *
 * @example
 *   const filtros = validar(filtrosRevisoesSchema, req.query);
 */
export function validar<S extends z.ZodType>(schema: S, dados: unknown): z.infer<S> {
  const resultado = schema.safeParse(dados);
  if (!resultado.success) {
    // flattenError agrupa as mensagens por campo: { fieldErrors: { km: [...] } }
    const { fieldErrors, formErrors } = z.flattenError(resultado.error);
    throw new ErroHttp(400, "Dados inválidos na requisição", {
      campos: fieldErrors,
      geral: formErrors,
    });
  }
  return resultado.data;
}
