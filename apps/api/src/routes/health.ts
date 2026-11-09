import { Router } from "express";

export const healthRouter = Router();

// GET /api/health — confirma que a API está no ar
healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "gestao-pos-venda-api",
    timestamp: new Date().toISOString(),
  });
});
