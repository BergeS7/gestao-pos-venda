/**
 * schemas/usuarios.ts — Formato aceito na tela de Usuários (Etapa 9, só Admin)
 *
 * O Admin cria o usuário com uma SENHA PROVISÓRIA e a entrega à pessoa.
 * No primeiro login o sistema obriga a trocar por uma senha que só ela sabe.
 */

import { z } from "zod";
import { Perfil } from "../generated/prisma/client.js";
import { emailSchema, novaSenhaSchema } from "./auth.js";

/** Id numérico vindo da URL (/api/usuarios/3). */
export const idUsuarioSchema = z.coerce.number().int().positive({ message: "Id de usuário inválido" });

const nomeSchema = z
  .string({ message: "Informe o nome" })
  .trim()
  .min(3, "O nome precisa ter pelo menos 3 letras")
  .max(120, "Nome muito longo");

const perfilSchema = z.enum(Perfil, { message: "Perfil inválido" });

/** Unidade (opcional para Gestor, Diretoria e Admin, que podem ver todas). */
const unidadeSchema = z.number().int().positive().nullable();

/** POST /api/usuarios */
export const criarUsuarioSchema = z
  .object({
    nome: nomeSchema,
    email: emailSchema,
    perfil: perfilSchema,
    unidadeId: unidadeSchema.default(null),
    senhaProvisoria: novaSenhaSchema,
  })
  .refine((d) => d.perfil !== Perfil.OPERADORA || d.unidadeId !== null, {
    message: "Escolha a unidade da operadora",
    path: ["unidadeId"],
  });

/** PATCH /api/usuarios/:id — só os campos enviados são alterados. */
export const alterarUsuarioSchema = z
  .object({
    nome: nomeSchema.optional(),
    email: emailSchema.optional(),
    perfil: perfilSchema.optional(),
    unidadeId: unidadeSchema.optional(),
    ativo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nada para alterar" });

/** POST /api/usuarios/:id/senha — o Admin define uma nova senha provisória. */
export const redefinirSenhaSchema = z.object({ senhaProvisoria: novaSenhaSchema });

export type CriarUsuarioParams = z.infer<typeof criarUsuarioSchema>;
export type AlterarUsuarioParams = z.infer<typeof alterarUsuarioSchema>;
