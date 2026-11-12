/**
 * schemas/auth.ts — Formato aceito no login e na troca de senha (Etapa 9)
 *
 * Também define a regra de senha usada em todo o sistema (`novaSenhaSchema`):
 * pelo menos 8 caracteres, com letras e números. Regra simples de lembrar,
 * que já impede senhas óbvias como "12345678".
 */

import { z } from "zod";
import { SENHA_MINIMA } from "../lib/senhas.js";

/** E-mail: sem espaços nas pontas e sempre em minúsculo (o login não diferencia maiúsculas). */
export const emailSchema = z
  .string({ message: "Informe o e-mail" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "E-mail inválido" }).max(160));

/** Regra de senha nova. Limite de 72 caracteres: o bcrypt ignora o que passa disso. */
export const novaSenhaSchema = z
  .string({ message: "Informe a senha" })
  .min(SENHA_MINIMA, `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres`)
  .max(72, "A senha pode ter no máximo 72 caracteres")
  .regex(/[A-Za-zÀ-ÿ]/, "A senha precisa ter pelo menos uma letra")
  .regex(/\d/, "A senha precisa ter pelo menos um número");

/** POST /api/auth/login. A senha não passa pela regra de senha nova (só é comparada). */
export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string({ message: "Informe a senha" }).min(1, "Informe a senha").max(200),
});

/** POST /api/auth/senha — a própria pessoa troca a senha. */
export const trocarSenhaSchema = z
  .object({
    senhaAtual: z.string({ message: "Informe a senha atual" }).min(1, "Informe a senha atual").max(200),
    novaSenha: novaSenhaSchema,
  })
  .refine((d) => d.senhaAtual !== d.novaSenha, {
    message: "A nova senha precisa ser diferente da atual",
    path: ["novaSenha"],
  });

export type LoginParams = z.infer<typeof loginSchema>;
export type TrocarSenhaParams = z.infer<typeof trocarSenhaSchema>;
