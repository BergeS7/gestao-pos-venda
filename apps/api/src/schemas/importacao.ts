/**
 * schemas/importacao.ts — Formato aceito na tela de Importações (Etapa 6, Gestor e Admin)
 */

import { z } from "zod";

/** Id da importação na URL. */
export const idImportacaoSchema = z.coerce.number().int().positive({ message: "Id de importação inválido" });

/**
 * Campos de texto do formulário de upload (multipart). Os arquivos vêm à parte (multer).
 * exigirTipoOs: "true" = só tira da lista a OS cujo tipo corresponde ao km (ver importacao/cruzamento.ts).
 */
export const previaSchema = z.object({
  exigirTipoOs: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
