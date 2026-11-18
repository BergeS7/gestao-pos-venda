/**
 * routes/importacoes.ts — Importação dos relatórios do Cloud (Etapa 6)
 *
 * Montadas em /api/importacoes, só para Gestor e Admin (app.ts).
 *
 *   POST /previa           upload (multipart): campos de arquivo "revisoes" e/ou
 *                          "espelhamento", e "exigirTipoOs" ("true"/"false").
 *                          Lê, cruza e devolve a prévia. Nada entra na fila.
 *   GET  /                 histórico (últimas 50)
 *   GET  /:id              uma importação (com as listas, se ainda em prévia)
 *   POST /:id/confirmar    grava na fila (refaz o cruzamento com o banco atual)
 *   POST /:id/cancelar     descarta a prévia
 *
 * Regras em services/importacao.ts e services/importacao/.
 */

import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { ErroHttp } from "../lib/erros.js";
import { validar } from "../lib/validar.js";
import { usuarioLogado } from "../middleware/auth.js";
import { idImportacaoSchema, previaSchema } from "../schemas/importacao.js";
import {
  cancelarImportacao,
  confirmarImportacao,
  detalharImportacao,
  gerarPrevia,
  listarImportacoes,
} from "../services/importacao.js";

export const importacoesRouter = Router();

/** Tamanho máximo de cada arquivo (os relatórios reais têm poucas centenas de kB). */
const MAX_ARQUIVO_MB = 10;

/**
 * Upload em memória (o arquivo não é salvo em disco: é lido e descartado).
 * Só os dois campos esperados, um arquivo cada.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ARQUIVO_MB * 1024 * 1024, files: 2 },
}).fields([
  { name: "revisoes", maxCount: 1 },
  { name: "espelhamento", maxCount: 1 },
]);

/** Roda o multer e transforma os erros dele em mensagens claras (413/400). */
function receberArquivos(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (erro: unknown) => {
    if (erro instanceof multer.MulterError) {
      if (erro.code === "LIMIT_FILE_SIZE") return next(new ErroHttp(413, `Arquivo maior que ${MAX_ARQUIVO_MB} MB.`));
      return next(new ErroHttp(400, "Envio inválido: use os campos de arquivo da tela de importação."));
    }
    next(erro);
  });
}

/** Nome original do arquivo. O multer lê o nome como Latin-1; os navegadores mandam em UTF-8. */
function nomeOriginal(f: Express.Multer.File): string {
  return Buffer.from(f.originalname, "latin1").toString("utf8");
}

importacoesRouter.post("/previa", receberArquivos, async (req, res) => {
  const { exigirTipoOs } = validar(previaSchema, req.body ?? {});
  const arquivos = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>;
  const para = (f?: Express.Multer.File) => (f ? { buffer: f.buffer, nome: nomeOriginal(f) } : undefined);
  const previa = await gerarPrevia(
    usuarioLogado(req),
    { revisoes: para(arquivos.revisoes?.[0]), espelhamento: para(arquivos.espelhamento?.[0]) },
    exigirTipoOs,
  );
  res.status(201).json(previa);
});

importacoesRouter.get("/", async (_req, res) => {
  res.json(await listarImportacoes());
});

importacoesRouter.get("/:id", async (req, res) => {
  res.json(await detalharImportacao(validar(idImportacaoSchema, req.params.id)));
});

importacoesRouter.post("/:id/confirmar", async (req, res) => {
  res.json(await confirmarImportacao(usuarioLogado(req), validar(idImportacaoSchema, req.params.id)));
});

importacoesRouter.post("/:id/cancelar", async (req, res) => {
  res.json(await cancelarImportacao(usuarioLogado(req), validar(idImportacaoSchema, req.params.id)));
});
