/**
 * routes/catalogos.ts — Listas de apoio para as telas
 *
 * Dados pequenos e quase fixos, usados para montar filtros e seletores:
 *
 * | Método | Caminho          | O que devolve                                  |
 * |--------|------------------|------------------------------------------------|
 * | GET    | /api/unidades    | Unidades (STI, ZDC, BRT)                       |
 * | GET    | /api/operadoras  | Usuários ativos com perfil OPERADORA           |
 * | GET    | /api/motivos     | Motivos de não agendamento ativos (Etapa 8)    |
 *
 * As consultas são simples o bastante para ficarem aqui, sem camada de serviço.
 * Se ganharem regras, devem ir para services/.
 */

import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { Perfil } from "../generated/prisma/client.js";

export const catalogosRouter = Router();

/** GET /api/unidades → [{ id, sigla, nome }] */
catalogosRouter.get("/unidades", async (_req, res) => {
  res.json(
    await prisma.unidade.findMany({
      select: { id: true, sigla: true, nome: true },
      orderBy: { sigla: "asc" },
    }),
  );
});

/** GET /api/operadoras → [{ id, nome, unidade: { sigla } | null }]. E-mail não é exposto. */
catalogosRouter.get("/operadoras", async (_req, res) => {
  res.json(
    await prisma.usuario.findMany({
      where: { ativo: true, perfil: Perfil.OPERADORA },
      select: { id: true, nome: true, unidade: { select: { sigla: true } } },
      orderBy: { nome: "asc" },
    }),
  );
});

/** GET /api/motivos → [{ id, descricao, encerraCliente }] */
catalogosRouter.get("/motivos", async (_req, res) => {
  res.json(
    await prisma.motivo.findMany({
      where: { ativo: true },
      select: { id: true, descricao: true, encerraCliente: true },
      orderBy: { id: "asc" },
    }),
  );
});
