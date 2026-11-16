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
 *   1. Middlewares globais (cabeçalhos de segurança, CORS, JSON e cookies)
 *   2. Rotas da API: /health e /auth são abertas; o resto exige login (Etapa 9)
 *   3. 404 da API (nenhuma rota /api respondeu)
 *   4. Telas do frontend, em produção (Etapa 11): arquivos do build + index.html
 *   5. Tratador de erros (sempre por último)
 */

import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { join } from "node:path";
import { config, servirFrontend } from "./config.js";
import { ErroHttp } from "./lib/erros.js";
import { healthRouter } from "./routes/health.js";
import { revisoesRouter } from "./routes/revisoes.js";
import { relatoriosRouter } from "./routes/relatorios.js";
import { catalogosRouter } from "./routes/catalogos.js";
import { authRouter } from "./routes/auth.js";
import { auditoriaRouter, usuariosRouter } from "./routes/usuarios.js";
import { exigirLogin, exigirPerfil } from "./middleware/auth.js";
import { Perfil } from "./generated/prisma/client.js";

/** Instância da aplicação Express, exportada para o server.ts e para os testes. */
export const app = express();

// ---------------------------------------------------------------------------
// 1. Middlewares globais
// ---------------------------------------------------------------------------

// Cabeçalhos de segurança (helmet), Etapa 11. A "política de conteúdo" (CSP)
// diz ao navegador de onde a página pode carregar cada coisa: só deste
// endereço, mais as fontes do Google (Montserrat). Estilos inline são
// permitidos porque o React e o Chart.js usam o atributo style.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": config.nodeEnv === "production" ? [] : null,
      },
    },
  }),
);

// CORS: permite que o frontend (outro endereço/porta) chame esta API.
// Só a origem configurada em CORS_ORIGIN é aceita. `credentials` deixa o
// navegador mandar o cookie de sessão (em desenvolvimento o proxy do Vite já
// deixa tudo no mesmo endereço, então o CORS quase não entra em ação).
app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Lê os cookies (o de sessão, Etapa 9) para req.cookies.
app.use(cookieParser());

// Converte o corpo das requisições JSON em objeto (disponível em req.body).
// Limite de 100 kB: nenhuma tela manda mais que isso.
app.use(express.json({ limit: "100kb" }));

// Atrás de um proxy (produção), confia no primeiro para ler o IP real de quem
// acessa, usado no limite de tentativas de login.
if (config.nodeEnv === "production") app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// 2. Rotas
// Cada grupo de rotas fica num arquivo em src/routes/ e é "montado"
// sob um prefixo. Todas as rotas da API começam com /api.
//
// PERMISSÕES (Etapa 9): `exigirLogin` barra quem não está logado (401) e
// `exigirPerfil` barra perfis sem permissão (403). As regras finas, como
// "operadora só vê a própria carteira", ficam nas rotas e serviços.
// ---------------------------------------------------------------------------
app.use("/api/health", healthRouter); // aberta: usada para saber se a API está no ar
app.use("/api/auth", authRouter); // aberta: login, logout, quem sou eu, trocar senha
app.use("/api/revisoes", exigirLogin, revisoesRouter);
app.use("/api/relatorios", exigirLogin, relatoriosRouter); // Dashboard e Excel (Etapa 10)
app.use("/api/usuarios", exigirLogin, exigirPerfil(Perfil.ADMIN), usuariosRouter);
app.use("/api/auditoria", exigirLogin, exigirPerfil(Perfil.ADMIN), auditoriaRouter);
app.use("/api", exigirLogin, catalogosRouter); // /api/unidades, /api/operadoras, /api/motivos
// (Express 5 já encaminha erros de rotas async para o tratador de erros abaixo)

// ---------------------------------------------------------------------------
// 3. Rota da API não encontrada (404)
// Se uma requisição /api chegou até aqui, nenhuma rota acima respondeu.
// ---------------------------------------------------------------------------
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ---------------------------------------------------------------------------
// 4. Telas do frontend (só em produção, ver servirFrontend em config.ts)
//  - /assets/...: arquivos do build com "hash" no nome (mudam de nome a cada
//    versão), então o navegador pode guardar por 1 ano;
//  - qualquer outra página (/dashboard, /revisoes/12...): devolve o
//    index.html, e o React Router mostra a tela certa. Ele nunca fica em cache,
//    para a versão nova aparecer assim que for publicada.
// ---------------------------------------------------------------------------
if (servirFrontend) {
  // fallthrough: false → arquivo que não existe em /assets responde 404 (e não o index.html)
  app.use(
    "/assets",
    express.static(join(config.webDist, "assets"), { immutable: true, maxAge: "1y", fallthrough: false }),
  );
  app.use(express.static(config.webDist, { index: false, maxAge: "1h" }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(join(config.webDist, "index.html"));
  });
}

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ---------------------------------------------------------------------------
// 5. Tratamento de erros
// O Express reconhece este middleware pelos 4 parâmetros (err, req, res, next).
// Qualquer erro lançado numa rota cai aqui:
//  - ErroHttp (lib/erros.ts): erro "esperado", culpa da requisição (400, 404...).
//    A mensagem é segura para o usuário e vai na resposta.
//  - JSON malformado no corpo: o express.json() lança um erro com status 400.
//  - Outros erros 4xx do Express (arquivo inexistente em /assets, corpo grande demais).
//  - Qualquer outro: erro inesperado. O detalhe vai só para o log do servidor,
//    e o cliente recebe uma mensagem genérica, sem expor informações internas.
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ErroHttp) {
    res.status(err.status).json({ error: err.message, detalhes: err.detalhes });
    return;
  }
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Corpo da requisição não é um JSON válido" });
    return;
  }
  // Erros do próprio Express com código 4xx (ex.: arquivo de /assets que não
  // existe = 404; corpo maior que 100 kB = 413): responde o código certo.
  const status = (err as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 404 ? "Não encontrado" : "Requisição inválida" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});
