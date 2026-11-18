/**
 * vitest.config.ts — Testes automáticos da API (Etapa 11)
 *
 * Rodar:  npm run test        (uma vez, como no "npm run check")
 *         npm run test:watch  (fica observando e roda de novo a cada mudança)
 *
 * Os testes ficam ao lado do código (arquivo.test.ts). Dois tipos:
 *  - regras puras (relatório, datas, CSV, validações, limite de login): sem banco;
 *  - rotas (src/routes/rotas.test.ts): ligam a API e usam um banco de TESTES,
 *    indicado em DATABASE_URL_TESTE. Sem essa variável, são pulados.
 *
 * setupFiles  → src/teste/ambiente.ts: troca o banco pelo de testes antes de tudo;
 * globalSetup → src/teste/prepararBanco.ts: cria/limpa o banco de testes e roda o seed.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    setupFiles: ["src/teste/ambiente.ts"],
    globalSetup: ["src/teste/prepararBanco.ts"],
    // Um arquivo por vez: os testes de rotas mexem no mesmo banco
    fileParallelism: false,
  },
});
