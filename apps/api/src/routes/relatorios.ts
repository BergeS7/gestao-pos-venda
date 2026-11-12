/**
 * routes/relatorios.ts — Relatório mensal de produção (Etapa 10)
 *
 * Montada em app.ts sob /api/relatorios, depois de `exigirLogin`.
 *
 * | Método | Caminho              | O que faz                                   | Quem pode |
 * |--------|----------------------|---------------------------------------------|-----------|
 * | GET    | /producao            | Relatório do mês em JSON (tela Dashboard)   | todos*    |
 * | GET    | /producao/exportar   | O mesmo relatório em Excel (.xlsx)          | todos*    |
 *
 * Query (todos opcionais): mes (AAAA-MM, padrão mês atual), unidade (sigla),
 * operador (id).
 *
 * (*) A OPERADORA vê só os PRÓPRIOS números: o filtro de operadora é
 *     forçado para ela, como na fila de revisões.
 *
 * Regras do cálculo: services/relatorios.ts e docs/regras-de-negocio.md (5.1).
 */

import { Router, type Request } from "express";
import { Perfil } from "../generated/prisma/client.js";
import { usuarioLogado } from "../middleware/auth.js";
import { validar } from "../lib/validar.js";
import { relatorioSchema, type FiltrosRelatorio } from "../schemas/relatorios.js";
import { relatorioProducao } from "../services/relatorios.js";
import { gerarExcelProducao } from "../services/relatoriosExcel.js";

export const relatoriosRouter = Router();

/** Valida os filtros e, para a operadora, troca o filtro de operadora pelo id dela. */
function filtrosDaRequisicao(req: Request): FiltrosRelatorio {
  const filtros = validar(relatorioSchema, req.query);
  const usuario = usuarioLogado(req);
  return usuario.perfil === Perfil.OPERADORA ? { ...filtros, operador: usuario.id } : filtros;
}

/** GET /api/relatorios/producao → Relatorio (ver o tipo em services/relatorios.ts) */
relatoriosRouter.get("/producao", async (req, res) => {
  res.json(await relatorioProducao(filtrosDaRequisicao(req)));
});

/**
 * GET /api/relatorios/producao/exportar
 * Baixa producao-AAAA-MM.xlsx (com "-STI" etc. quando há filtro de unidade).
 */
relatoriosRouter.get("/producao/exportar", async (req, res) => {
  const filtros = filtrosDaRequisicao(req);
  const relatorio = await relatorioProducao(filtros);

  // Texto do filtro no título da planilha (a operadora sai do próprio relatório)
  const partes: string[] = [];
  if (filtros.unidade) partes.push(`Unidade ${filtros.unidade}`);
  if (filtros.operador) partes.push(`Operadora ${relatorio.porOperadora[0]?.operadora.nome ?? `#${filtros.operador}`}`);

  const arquivo = await gerarExcelProducao(relatorio, partes.join(", "));
  const nome = `producao-${filtros.mes}${filtros.unidade ? `-${filtros.unidade}` : ""}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
  res.send(arquivo);
});
