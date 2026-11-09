import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { config } from "./config.js";
import { healthRouter } from "./routes/health.js";

// O app fica separado do server.ts para facilitar testes (etapa 6)
export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Rotas
app.use("/api/health", healthRouter);

// Rota não encontrada
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Erros não tratados
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});
