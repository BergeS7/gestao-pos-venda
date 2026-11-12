/**
 * lib/tokens.ts — Token de login (JWT) e cookie de sessão (Etapa 9)
 *
 * Depois do login, a API entrega um token JWT assinado com `JWT_SECRET`.
 * O token vai num COOKIE `httpOnly`, e não no localStorage, porque:
 *  - `httpOnly`: o JavaScript da página não consegue ler o cookie, então um
 *    script malicioso não rouba a sessão;
 *  - `SameSite=Strict`: o navegador só envia o cookie em requisições feitas
 *    pelo próprio sistema, o que bloqueia ataques CSRF (outro site tentando
 *    gravar algo em nome de quem está logado);
 *  - `Secure` em produção: só trafega em HTTPS.
 *
 * O token guarda só o id do usuário e a impressão da senha. Perfil, nome e
 * "ativo" são lidos do banco a cada requisição (middleware/auth.ts), então
 * mudar o perfil ou desativar alguém vale na hora.
 */

import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

/** Nome do cookie de sessão. */
export const COOKIE_SESSAO = "sessao";

/** Conteúdo do token. `sub` = id do usuário; `sv` = impressão da senha (lib/senhas.ts). */
export type ConteudoToken = { sub: string; sv: string };

/** Opções do cookie (as mesmas para gravar e para apagar). */
export function opcoesCookie(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: config.nodeEnv === "production",
    path: "/api",
  };
}

/** Validade da sessão em milissegundos. */
export function validadeMs(): number {
  return config.sessaoHoras * 60 * 60 * 1000;
}

/** Cria o token assinado de um usuário. */
export function criarToken(usuarioId: number, impressao: string): string {
  const conteudo: ConteudoToken = { sub: String(usuarioId), sv: impressao };
  return jwt.sign(conteudo, config.jwtSecret, { expiresIn: `${config.sessaoHoras}h`, algorithm: "HS256" });
}

/**
 * Lê e confere o token. Devolve null se for inválido, adulterado ou vencido.
 * O algoritmo é fixado em HS256 para não aceitar tokens "sem assinatura".
 */
export function lerToken(token: string | undefined): ConteudoToken | null {
  if (!token) return null;
  try {
    const conteudo = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    if (typeof conteudo !== "object" || typeof conteudo.sub !== "string" || typeof conteudo.sv !== "string") return null;
    return { sub: conteudo.sub, sv: conteudo.sv };
  } catch {
    return null;
  }
}
