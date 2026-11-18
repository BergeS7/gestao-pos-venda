/**
 * teste/ambiente.ts — Variáveis de ambiente dos testes (roda antes de cada arquivo de teste)
 *
 * Configurado em vitest.config.ts (setupFiles). Roda ANTES de qualquer import
 * do código da API, então o src/config.ts já enxerga estes valores:
 *
 *  - DATABASE_URL_TESTE definida → os testes de rotas usam ESSE banco, nunca o
 *    de desenvolvimento (o dotenv não sobrescreve variáveis que já existem);
 *  - NODE_ENV=test → nada de comportamento de produção (cookie "secure" etc.);
 *  - SEED_SENHA fixa → os testes sabem a senha dos usuários fictícios do seed;
 *  - JWT_SECRET → no CI não existe .env, então usamos uma chave só de teste.
 *
 * Sem DATABASE_URL_TESTE os testes de rotas são pulados (os de regras puras rodam).
 *
 * Primeiro carrega o apps/api/.env (onde fica DATABASE_URL_TESTE localmente);
 * no CI as variáveis já vêm do workflow.
 */

import "dotenv/config";

/** Senha dos usuários fictícios no banco de testes. */
export const SENHA_TESTE = "Teste2026";

if (process.env.DATABASE_URL_TESTE) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TESTE;
}
process.env.NODE_ENV = "test";
process.env.SEED_SENHA = SENHA_TESTE;
process.env.JWT_SECRET ??= "chave-usada-somente-nos-testes-automaticos-0123456789";
