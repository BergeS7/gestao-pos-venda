/**
 * middleware/auth.ts — Exigir login e conferir o perfil (Etapa 9)
 *
 * Uso nas rotas (app.ts e routes/*):
 *   app.use("/api/revisoes", exigirLogin, revisoesRouter);       // qualquer perfil logado
 *   router.patch("/atribuir", exigirPerfil("GESTOR", "ADMIN"), ...); // só esses perfis
 *
 * `exigirLogin` lê o cookie de sessão, confere o token e busca o usuário no
 * banco. Se der certo, coloca o usuário em `req.usuario` para as rotas usarem.
 * Respostas:
 *   401 = não está logado (ou a sessão venceu): a tela volta para o login;
 *   403 = está logado, mas o perfil não tem permissão.
 */

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { Perfil } from "../generated/prisma/client.js";
import { ErroHttp } from "../lib/erros.js";
import { impressaoDaSenha } from "../lib/senhas.js";
import { COOKIE_SESSAO, lerToken } from "../lib/tokens.js";

/** Usuário logado, disponível em `req.usuario` depois de `exigirLogin`. */
export type UsuarioLogado = {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  unidadeId: number | null;
  /** true = precisa trocar a senha antes de usar o sistema. */
  trocarSenha: boolean;
};

// Acrescenta `usuario` ao tipo Request do Express (forma oficial de estender os tipos dele)
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioLogado;
    }
  }
}

/** Código em `detalhes.codigo` quando a pessoa precisa trocar a senha antes de continuar. */
export const CODIGO_TROCAR_SENHA = "TROCAR_SENHA";

/**
 * Busca o usuário da sessão a partir do cookie. Devolve null se não houver
 * sessão válida: token ausente, vencido ou adulterado; usuário desativado;
 * ou senha trocada depois do login.
 */
export async function usuarioDaSessao(req: Request): Promise<UsuarioLogado | null> {
  const conteudo = lerToken(req.cookies?.[COOKIE_SESSAO]);
  if (!conteudo) return null;

  const id = Number(conteudo.sub);
  if (!Number.isInteger(id)) return null;

  const u = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, perfil: true, unidadeId: true, trocarSenha: true, ativo: true, senhaHash: true },
  });
  if (!u || !u.ativo || !u.senhaHash || impressaoDaSenha(u.senhaHash) !== conteudo.sv) return null;

  const { ativo: _ativo, senhaHash: _hash, ...usuario } = u;
  return usuario;
}

/**
 * Middleware: só deixa passar quem está logado.
 * Quem precisa trocar a senha só consegue acessar as rotas de /api/auth
 * (que não usam este middleware) até trocar.
 */
export async function exigirLogin(req: Request, _res: Response, next: NextFunction) {
  const usuario = await usuarioDaSessao(req);
  if (!usuario) throw new ErroHttp(401, "Faça login para continuar.");
  if (usuario.trocarSenha) {
    throw new ErroHttp(403, "Troque sua senha antes de continuar.", { codigo: CODIGO_TROCAR_SENHA });
  }
  req.usuario = usuario;
  next();
}

/**
 * Middleware: só deixa passar os perfis indicados. Use depois de `exigirLogin`.
 * @example router.post("/distribuir", exigirPerfil(Perfil.GESTOR, Perfil.ADMIN), ...)
 */
export function exigirPerfil(...perfis: Perfil[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) throw new ErroHttp(401, "Faça login para continuar.");
    if (!perfis.includes(req.usuario.perfil)) {
      throw new ErroHttp(403, "Seu perfil não tem permissão para esta ação.");
    }
    next();
  };
}

/** Pega o usuário logado numa rota protegida (garantido por `exigirLogin`). */
export function usuarioLogado(req: Request): UsuarioLogado {
  if (!req.usuario) throw new ErroHttp(401, "Faça login para continuar.");
  return req.usuario;
}

/** Perfis que podem gravar contatos e concluir revisões. Diretoria só consulta. */
export const PERFIS_ATENDIMENTO: Perfil[] = [Perfil.OPERADORA, Perfil.GESTOR, Perfil.ADMIN];

/** Perfis que organizam a fila (atribuir e distribuir). */
export const PERFIS_GESTAO: Perfil[] = [Perfil.GESTOR, Perfil.ADMIN];
