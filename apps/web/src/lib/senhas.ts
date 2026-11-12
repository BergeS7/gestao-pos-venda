/**
 * lib/senhas.ts — Regra de senha e gerador de senha provisória (Etapa 9)
 *
 * A regra é a mesma da API (apps/api/src/schemas/auth.ts): pelo menos
 * 8 caracteres, com letras e números. Aqui serve para avisar antes de enviar;
 * quem decide é a API.
 */

/** Tamanho mínimo da senha (igual a SENHA_MINIMA da API). */
export const SENHA_MINIMA = 8

/** Explica o que falta na senha, ou undefined se ela está boa. */
export function problemaDaSenha(senha: string): string | undefined {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres`
  if (!/[A-Za-zÀ-ÿ]/.test(senha)) return 'A senha precisa ter pelo menos uma letra'
  if (!/\d/.test(senha)) return 'A senha precisa ter pelo menos um número'
  return undefined
}

/** Letras e números sem os que se confundem ao ditar (0/O, 1/l/I). */
const CARACTERES = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITOS = '23456789'

/**
 * Gera uma senha provisória de 10 caracteres: 8 letras e 2 números, com
 * sorteio criptográfico (crypto.getRandomValues), não Math.random.
 */
export function gerarSenhaProvisoria(): string {
  const n = crypto.getRandomValues(new Uint32Array(10))
  const letras = Array.from(n.slice(0, 8), (v) => CARACTERES[v % CARACTERES.length])
  const numeros = Array.from(n.slice(8), (v) => DIGITOS[v % DIGITOS.length])
  return letras.join('') + numeros.join('')
}
