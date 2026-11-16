/**
 * vitest.config.ts — Testes automáticos da API (Etapa 11)
 *
 * Rodar:  npm run test        (uma vez, como no "npm run check")
 *         npm run test:watch  (fica observando e roda de novo a cada mudança)
 *
 * Os testes ficam ao lado do código (arquivo.test.ts) e não usam o banco:
 * testam regras puras (relatório, datas, CSV, validações, limite de login).
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
