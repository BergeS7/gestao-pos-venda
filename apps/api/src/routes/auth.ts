/**
 * routes/auth.ts — Login, sessão e troca de senha (Etapa 9)
 *
 * Montada em app.ts sob /api/auth. Estas rotas NÃO usam `exigirLogin`
 * (o login precisa funcionar sem estar logado).
 *
 * | Método | Caminho | O que faz                                                 |
 * |--------|---------|-----------------------------------------------------------|
 * | POST   | /login  | Confere e-mail e senha; grava o cookie de sessão          |
 * | POST   | /logout | Apaga o cookie de sessão                                  |
 * | GET    | /eu     | Quem está logado (401 se ninguém)                         |
 * | POST   | /senha  | Troca a própria senha (também a provisória)               |
 */

import { Router, type Response } from "express";
import { ErroHttp } from "../lib/erros.js";
import { COOKIE_SESSAO, opcoesCookie, validadeMs } from "../lib/tokens.js";
import { validar } from "../lib/validar.js";
import { usuarioDaSessao } from "../middleware/auth.js";
import { loginSchema, trocarSenhaSchema } from "../schemas/auth.js";
import { entrar, trocarSenha } from "../services/auth.js";

export const authRouter = Router();

/** Grava o token no cookie de sessão. */
function gravarSessao(res: Response, token: string) {
  res.cookie(COOKIE_SESSAO, token, { ...opcoesCookie(), maxAge: validadeMs() });
}

/**
 * POST /api/auth/login
 * Corpo: { email, senha }
 * Resposta 200: { id, nome, email, perfil, unidadeId, trocarSenha } + cookie de sessão
 * Resposta 401 e-mail ou senha incorretos; 429 muitas tentativas.
 */
authRouter.post("/login", async (req, res) => {
  const params = validar(loginSchema, req.body);
  const { usuario, token } = await entrar(params, req.ip ?? "desconhecido");
  gravarSessao(res, token);
  res.json(usuario);
});

/** POST /api/auth/logout → 204. Funciona mesmo sem sessão. */
authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_SESSAO, opcoesCookie());
  res.status(204).end();
});

/**
 * GET /api/auth/eu
 * Resposta 200: o usuário logado (com `trocarSenha`). 401 se não houver sessão válida.
 */
authRouter.get("/eu", async (req, res) => {
  const usuario = await usuarioDaSessao(req);
  if (!usuario) throw new ErroHttp(401, "Faça login para continuar.");
  res.json(usuario);
});

/**
 * POST /api/auth/senha
 * Corpo: { senhaAtual, novaSenha }
 * Resposta 200: o usuário (com trocarSenha = false) + cookie novo.
 * Os logins abertos em outros lugares deixam de valer.
 */
authRouter.post("/senha", async (req, res) => {
  const usuario = await usuarioDaSessao(req);
  if (!usuario) throw new ErroHttp(401, "Faça login para continuar.");
  const params = validar(trocarSenhaSchema, req.body);
  const resultado = await trocarSenha(usuario, params);
  gravarSessao(res, resultado.token);
  res.json(resultado.usuario);
});
