/**
 * lib/senhas.ts — Senhas com bcrypt (Etapa 9)
 *
 * A senha NUNCA é guardada. O banco guarda só o "hash" bcrypt dela: um texto
 * calculado a partir da senha que não pode ser desfeito. No login, o bcrypt
 * calcula de novo e compara.
 *
 * Usamos `bcryptjs` (JavaScript puro) em vez de `bcrypt` (nativo) porque não
 * precisa compilar nada no Windows. O formato do hash é o mesmo.
 *
 * Custo 12 = cada verificação leva ~0,2 s: imperceptível para quem entra,
 * mas torna inviável testar milhões de senhas se o banco vazar.
 */

import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

/** Custo do bcrypt (2^12 rodadas). Aumentar deixa o login mais lento e mais seguro. */
const CUSTO_BCRYPT = 12;

/** Tamanho mínimo da senha. */
export const SENHA_MINIMA = 8;

/** Gera o hash bcrypt de uma senha (para gravar em usuarios.senha_hash). */
export function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO_BCRYPT);
}

/**
 * Hash de uma senha qualquer, usado quando o e-mail não existe: o login
 * compara contra ele e demora o mesmo tempo, para que ninguém descubra
 * quais e-mails existem medindo o tempo da resposta.
 */
const HASH_FICTICIO = bcrypt.hashSync("senha-que-nao-existe", CUSTO_BCRYPT);

/**
 * Confere se a senha corresponde ao hash. Se `hash` for nulo (usuário sem
 * senha ou inexistente), compara com um hash fictício e devolve false.
 */
export async function conferirSenha(senha: string, hash: string | null | undefined): Promise<boolean> {
  const confere = await bcrypt.compare(senha, hash ?? HASH_FICTICIO);
  return Boolean(hash) && confere;
}

/**
 * "Impressão digital" curta do hash da senha, gravada dentro do token de login.
 * Quando a senha muda, a impressão muda e os logins antigos deixam de valer
 * (ex.: alguém esqueceu a sessão aberta e a senha foi trocada).
 * Não revela a senha nem o hash.
 */
export function impressaoDaSenha(hash: string): string {
  return createHash("sha256").update(hash).digest("base64url").slice(0, 16);
}
