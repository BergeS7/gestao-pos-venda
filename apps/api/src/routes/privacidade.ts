/**
 * routes/privacidade.ts — Rotas de LGPD (direitos do titular), só Admin
 *
 * Montadas em /api/privacidade, com exigirLogin + exigirPerfil(ADMIN) no app.ts.
 *
 *   GET  /titulares?busca=...           clientes por CPF/CNPJ ou nome (documento mascarado)
 *   GET  /titulares/:id                 tudo o que o sistema guarda sobre o cliente (auditado)
 *   POST /titulares/:id/anonimizar      apaga os dados pessoais { confirmacao: "ANONIMIZAR" }
 *
 * Regras em services/privacidade.ts; procedimento em docs/lgpd.md.
 */

import { Router } from "express";
import { usuarioLogado } from "../middleware/auth.js";
import { validar } from "../lib/validar.js";
import { anonimizarSchema, buscaTitularSchema, idClienteSchema } from "../schemas/privacidade.js";
import { anonimizarCliente, buscarTitulares, dadosDoTitular } from "../services/privacidade.js";

export const privacidadeRouter = Router();

privacidadeRouter.get("/titulares", async (req, res) => {
  const { busca } = validar(buscaTitularSchema, req.query);
  res.json(await buscarTitulares(busca));
});

privacidadeRouter.get("/titulares/:id", async (req, res) => {
  const id = validar(idClienteSchema, req.params.id);
  res.json(await dadosDoTitular(id, usuarioLogado(req)));
});

privacidadeRouter.post("/titulares/:id/anonimizar", async (req, res) => {
  const id = validar(idClienteSchema, req.params.id);
  validar(anonimizarSchema, req.body);
  res.json(await anonimizarCliente(id, usuarioLogado(req).id, "PEDIDO_DO_TITULAR"));
});
