/**
 * routes/health.ts — Rota de verificação de saúde ("health check")
 *
 * Responde se a API está no ar. Serve para:
 *  - o frontend mostrar "API ok" no Dashboard;
 *  - monitoramento da hospedagem no futuro (ex.: verificar a cada minuto).
 *
 * Montada em app.ts sob o prefixo /api/health.
 */

import { Router } from "express";

/** Grupo de rotas de health check. */
export const healthRouter = Router();

/**
 * GET /api/health
 *
 * Resposta 200:
 * ```json
 * { "ok": true, "service": "gestao-pos-venda-api", "timestamp": "2026-11-09T17:50:27.683Z" }
 * ```
 * O `timestamp` é a hora do servidor (ISO 8601, UTC).
 */
healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "gestao-pos-venda-api",
    timestamp: new Date().toISOString(),
  });
});
