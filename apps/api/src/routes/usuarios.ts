/**
 * routes/usuarios.ts — Tela de Usuários e auditoria (Etapa 9, só Admin)
 *
 * Montadas em app.ts sob /api/usuarios e /api/auditoria, depois de
 * `exigirLogin` e `exigirPerfil(ADMIN)`.
 *
 * | Método | Caminho                | O que faz                                     |
 * |--------|------------------------|-----------------------------------------------|
 * | GET    | /usuarios              | Lista todos os usuários (sem hash de senha)   |
 * | POST   | /usuarios              | Cria usuário com senha provisória             |
 * | PATCH  | /usuarios/:id          | Altera nome, e-mail, perfil, unidade, ativo   |
 * | POST   | /usuarios/:id/senha    | Define nova senha provisória                  |
 * | GET    | /auditoria             | Últimas alterações (paginado)                 |
 */

import { Router } from "express";
import { z } from "zod";
import { validar } from "../lib/validar.js";
import { usuarioLogado } from "../middleware/auth.js";
import {
  alterarUsuarioSchema,
  criarUsuarioSchema,
  idUsuarioSchema,
  redefinirSenhaSchema,
} from "../schemas/usuarios.js";
import { listarAuditoria } from "../services/auditoria.js";
import { alterarUsuario, criarUsuario, listarUsuarios, redefinirSenha } from "../services/usuarios.js";

export const usuariosRouter = Router();
export const auditoriaRouter = Router();

/** GET /api/usuarios → [{ id, nome, email, perfil, ativo, trocarSenha, temSenha, ultimoAcesso, unidade }] */
usuariosRouter.get("/", async (_req, res) => {
  res.json(await listarUsuarios());
});

/**
 * POST /api/usuarios
 * Corpo: { nome, email, perfil, unidadeId?, senhaProvisoria }
 * Resposta 201: o usuário criado. 400 se o e-mail já existir.
 */
usuariosRouter.post("/", async (req, res) => {
  const params = validar(criarUsuarioSchema, req.body);
  res.status(201).json(await criarUsuario(usuarioLogado(req), params));
});

/**
 * PATCH /api/usuarios/:id
 * Corpo: qualquer combinação de { nome, email, perfil, unidadeId, ativo }
 * Resposta 200: { usuario, revisoesLiberadas } (revisões que voltaram para "sem operadora" ao desativar)
 */
usuariosRouter.patch("/:id", async (req, res) => {
  const id = validar(idUsuarioSchema, req.params.id);
  const params = validar(alterarUsuarioSchema, req.body);
  res.json(await alterarUsuario(usuarioLogado(req), id, params));
});

/**
 * POST /api/usuarios/:id/senha
 * Corpo: { senhaProvisoria }
 * Resposta 204. A pessoa precisará trocar a senha no próximo login.
 */
usuariosRouter.post("/:id/senha", async (req, res) => {
  const id = validar(idUsuarioSchema, req.params.id);
  const { senhaProvisoria } = validar(redefinirSenhaSchema, req.body);
  await redefinirSenha(usuarioLogado(req), id, senhaProvisoria);
  res.status(204).end();
});

/** Paginação da auditoria. */
const paginaAuditoriaSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(30),
});

/** GET /api/auditoria?pagina=1&porPagina=30 → { itens, total, pagina, porPagina, totalPaginas } */
auditoriaRouter.get("/", async (req, res) => {
  res.json(await listarAuditoria(validar(paginaAuditoriaSchema, req.query)));
});
