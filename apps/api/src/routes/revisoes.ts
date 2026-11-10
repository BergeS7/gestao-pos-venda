/**
 * routes/revisoes.ts — Rotas HTTP da fila de revisões
 *
 * Camada de ROTA: lê e valida os parâmetros da requisição, chama o serviço
 * e devolve JSON. Regras de negócio NÃO ficam aqui (ver services/revisoes.ts).
 *
 * Montada em app.ts sob o prefixo /api/revisoes.
 */

import { Router } from "express";
import { listarRevisoes } from "../services/revisoes.js";

export const revisoesRouter = Router();

/** Limite de itens por página, para nenhuma requisição puxar a tabela inteira. */
const MAX_POR_PAGINA = 100;

/**
 * Converte um parâmetro de query em inteiro dentro de um intervalo.
 * Valores ausentes ou inválidos viram o padrão.
 * (Na Etapa 6 a validação passa a usar a biblioteca zod.)
 */
function inteiro(valor: unknown, padrao: number, min: number, max: number): number {
  const n = Number(valor);
  if (!Number.isInteger(n)) return padrao;
  return Math.min(Math.max(n, min), max);
}

/**
 * GET /api/revisoes?pagina=1&porPagina=20
 *
 * Resposta 200:
 * ```json
 * { "itens": [ ... ], "total": 20, "pagina": 1, "porPagina": 20, "totalPaginas": 1 }
 * ```
 * Erros de banco caem no tratador de erros do app.ts (resposta 500).
 */
revisoesRouter.get("/", async (req, res) => {
  const pagina = inteiro(req.query.pagina, 1, 1, Number.MAX_SAFE_INTEGER);
  const porPagina = inteiro(req.query.porPagina, 20, 1, MAX_POR_PAGINA);

  const resultado = await listarRevisoes({ pagina, porPagina });
  res.json(resultado);
});
