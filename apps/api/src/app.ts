/**
 * app.ts — Montagem da aplicação Express
 *
 * Aqui o app é configurado (middlewares, rotas e tratamento de erros),
 * mas NÃO é colocado no ar. Quem liga o servidor é o `server.ts`.
 *
 * Por que separar? Nos testes automatizados (Etapa 6) vamos importar o `app`
 * e fazer requisições a ele sem abrir uma porta de verdade.
 *
 * Ordem importa no Express: as requisições passam pelos `app.use(...)`
 * de cima para baixo.
 *   1. Middlewares globais (CORS, leitura de JSON)
 *   2. Rotas da API
 *   3. 404 (nenhuma rota respondeu)
 *   4. Tratador de erros (sempre por último)
 */

import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { config } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { revisoesRouter } from "./routes/revisoes.js";

/** Instância da aplicação Express, exportada para o server.ts e para os testes. */
export const app = express();

// ---------------------------------------------------------------------------
// 1. Middlewares globais
// ---------------------------------------------------------------------------

// CORS: permite que o frontend (outro endereço/porta) chame esta API.
// Só a origem configurada em CORS_ORIGIN é aceita.
app.use(cors({ origin: config.corsOrigin }));

// Converte o corpo das requisições JSON em objeto (disponível em req.body).
app.use(express.json());

// ---------------------------------------------------------------------------
// 2. Rotas
// Cada grupo de rotas fica num arquivo em src/routes/ e é "montado"
// sob um prefixo. Todas as rotas da API começam com /api.
// ---------------------------------------------------------------------------
app.use("/api/health", healthRouter);
app.use("/api/revisoes", revisoesRouter);
// (Express 5 já encaminha erros de rotas async para o tratador de erros abaixo)

// ---------------------------------------------------------------------------
// 3. Rota não encontrada (404)
// Se a requisição chegou até aqui, nenhuma rota acima respondeu.
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ---------------------------------------------------------------------------
// 4. Tratamento de erros
// O Express reconhece este middleware pelos 4 parâmetros (err, req, res, next).
// Qualquer erro lançado numa rota cai aqui. O detalhe vai para o log do
// servidor, e o cliente recebe só uma mensagem genérica, sem expor
// informações internas.
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});
