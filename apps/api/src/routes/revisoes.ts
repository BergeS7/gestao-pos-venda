/**
 * routes/revisoes.ts — Rotas HTTP da fila de revisões
 *
 * Camada de ROTA: valida a entrada (zod, via lib/validar.ts), chama o serviço
 * e devolve a resposta. Regras de negócio NÃO ficam aqui (ver services/revisoes.ts).
 *
 * Montada em app.ts sob o prefixo /api/revisoes.
 *
 * | Método | Caminho      | O que faz                                          |
 * |--------|--------------|----------------------------------------------------|
 * | GET    | /            | Lista a fila (filtros + paginação)                 |
 * | GET    | /exportar    | Baixa a fila filtrada em CSV (abre no Excel)       |
 * | PATCH  | /atribuir    | Atribui revisões selecionadas a uma operadora      |
 * | POST   | /distribuir  | Divide as revisões sem operadora entre operadoras  |
 * | GET    | /:id         | Tela do cliente: revisão + histórico de contatos   |
 * | POST   | /:id/tentativas | Registra uma ligação (Etapa 8)                  |
 * | PATCH  | /:id/concluir   | Marca como feita na oficina, ou reabre          |
 *
 * Erros de validação respondem 400; os demais caem no tratador do app.ts.
 * As rotas com :id ficam por último para que "/exportar" não seja lido como id.
 */

import { Router } from "express";
import { validar } from "../lib/validar.js";
import { gerarCsv, type ColunaCsv } from "../lib/csv.js";
import { celularBR, dataBR, ROTULO_SITUACAO } from "../lib/formatar.js";
import { diaBR } from "../lib/datas.js";
import { concluirSchema, idRevisaoSchema, registrarTentativaSchema } from "../schemas/atendimentos.js";
import { concluirRevisao, detalharRevisao, registrarTentativa } from "../services/atendimentos.js";
import {
  atribuirSchema,
  distribuirSchema,
  filtrosRevisoesSchema,
  listarRevisoesSchema,
} from "../schemas/revisoes.js";
import {
  atribuirOperadora,
  distribuirRevisoes,
  listarParaExportar,
  listarRevisoes,
} from "../services/revisoes.js";

export const revisoesRouter = Router();

/**
 * GET /api/revisoes
 *
 * Query (todos opcionais):
 *   busca, unidade (STI|ZDC|BRT), operador (id ou "sem"), km (1000|6000|12000|18000),
 *   situacao (PENDENTE|RETORNAR|AGENDADO|NAO_AGENDADO|BUSCAR_CONTATO|CONCLUIDA),
 *   mesVenda (AAAA-MM), pagina (padrão 1), porPagina (padrão 20, máx. 100)
 *
 * Resposta 200: { itens: [...], total, pagina, porPagina, totalPaginas }
 */
revisoesRouter.get("/", async (req, res) => {
  const params = validar(listarRevisoesSchema, req.query);
  res.json(await listarRevisoes(params));
});

/** Linha exportada (o mesmo formato que o serviço devolve). */
type LinhaExportacao = Awaited<ReturnType<typeof listarParaExportar>>[number];

/** Colunas do CSV exportado. CPF fica de fora de propósito (dado sensível). */
const colunasExportacao: ColunaCsv<LinhaExportacao>[] = [
  { titulo: "Cliente", valor: (r) => r.veiculo.cliente.nome },
  { titulo: "Celular", valor: (r) => celularBR(r.veiculo.cliente.celular) },
  { titulo: "Município", valor: (r) => r.veiculo.cliente.municipio },
  { titulo: "Unidade", valor: (r) => r.unidade?.sigla },
  { titulo: "Chassi", valor: (r) => r.veiculo.chassi },
  { titulo: "Modelo", valor: (r) => r.veiculo.modelo },
  { titulo: "Cor", valor: (r) => r.veiculo.cor },
  { titulo: "Data venda", valor: (r) => dataBR(r.veiculo.dataVenda) },
  { titulo: "Revisão (km)", valor: (r) => r.km },
  { titulo: "Situação", valor: (r) => ROTULO_SITUACAO[r.situacao] },
  { titulo: "Operadora", valor: (r) => r.operador?.nome ?? "Sem operadora" },
  // Datas só dia: diaBR (sem conversão de fuso; ver lib/datas.ts)
  { titulo: "Próximo contato", valor: (r) => diaBR(r.proximoContato) },
  { titulo: "Data agendada", valor: (r) => diaBR(r.dataAgendada) },
];

/**
 * GET /api/revisoes/exportar
 *
 * Aceita os mesmos filtros da listagem (a paginação é ignorada) e devolve um
 * arquivo CSV para download: fila-revisoes-AAAA-MM-DD.csv
 * Resposta 413 se passar do limite de linhas (ver MAX_EXPORTACAO).
 */
revisoesRouter.get("/exportar", async (req, res) => {
  const filtros = validar(filtrosRevisoesSchema, req.query);
  const linhas = await listarParaExportar(filtros);

  const hoje = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  // attachment = o navegador baixa o arquivo em vez de abrir na tela
  res.setHeader("Content-Disposition", `attachment; filename="fila-revisoes-${hoje}.csv"`);
  res.send(gerarCsv(colunasExportacao, linhas));
});

/**
 * PATCH /api/revisoes/atribuir
 *
 * Corpo: { "ids": [1, 2, 3], "operadorId": 4 }   (operadorId null = tirar a operadora)
 * Resposta 200: { "atualizadas": 3 }
 * Resposta 404 se a operadora não existir ou estiver inativa.
 */
revisoesRouter.patch("/atribuir", async (req, res) => {
  const params = validar(atribuirSchema, req.body);
  res.json(await atribuirOperadora(params));
});

/**
 * POST /api/revisoes/distribuir
 *
 * Corpo: { "operadorIds": [2, 3, 4], "filtros": { "unidade": "STI", "km": 1000 } }
 * Divide em partes iguais as revisões SEM operadora (e não concluídas) do filtro.
 * Resposta 200: { "distribuidas": 7, "porOperadora": [{ "operadorId": 2, "quantidade": 3 }, ...] }
 */
revisoesRouter.post("/distribuir", async (req, res) => {
  const params = validar(distribuirSchema, req.body);
  res.json(await distribuirRevisoes(params));
});

// ---------------------------------------------------------------------------
// Tela do cliente (Etapa 8)
// ---------------------------------------------------------------------------

/**
 * GET /api/revisoes/:id
 * Resposta 200: a revisão (mesmos campos da fila) + `tentativas` (mais nova primeiro).
 * Resposta 404 se não existir.
 */
revisoesRouter.get("/:id", async (req, res) => {
  const id = validar(idRevisaoSchema, req.params.id);
  res.json(await detalharRevisao(id));
});

/**
 * POST /api/revisoes/:id/tentativas
 *
 * Corpo: { versao, conseguiuFalar, resultado: "SIM"|"NAO"|"RETORNAR",
 *          motivoId?, dataAgendada?: "AAAA-MM-DD", proximoContato?: "AAAA-MM-DD", observacoes? }
 * Resposta 201: a revisão atualizada, com o histórico.
 * Resposta 409 se outra pessoa alterou a revisão antes (versão diferente) ou se ela já está concluída.
 */
revisoesRouter.post("/:id/tentativas", async (req, res) => {
  const id = validar(idRevisaoSchema, req.params.id);
  const params = validar(registrarTentativaSchema, req.body);
  res.status(201).json(await registrarTentativa(id, params));
});

/**
 * PATCH /api/revisoes/:id/concluir
 *
 * Corpo: { versao, concluida: true | false }
 * Resposta 200: a revisão atualizada. 409 se a versão estiver desatualizada.
 */
revisoesRouter.patch("/:id/concluir", async (req, res) => {
  const id = validar(idRevisaoSchema, req.params.id);
  const params = validar(concluirSchema, req.body);
  res.json(await concluirRevisao(id, params));
});
