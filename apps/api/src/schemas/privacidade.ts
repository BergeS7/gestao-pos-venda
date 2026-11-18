/**
 * schemas/privacidade.ts — Formato aceito na tela de Privacidade (LGPD, só Admin)
 */

import { z } from "zod";

/** GET /api/privacidade/titulares?busca=... — CPF/CNPJ ou parte do nome (3+ letras). */
export const buscaTitularSchema = z.object({
  busca: z.string().trim().min(3, { message: "Digite pelo menos 3 caracteres" }).max(100),
});

/** Id do cliente na URL. */
export const idClienteSchema = z.coerce.number().int().positive({ message: "Id de cliente inválido" });

/**
 * Corpo de POST /api/privacidade/titulares/:id/anonimizar.
 * A palavra de confirmação evita anonimizar por um clique errado (não tem volta).
 */
export const anonimizarSchema = z.object({
  confirmacao: z.literal("ANONIMIZAR", { message: "Digite ANONIMIZAR para confirmar" }),
});
