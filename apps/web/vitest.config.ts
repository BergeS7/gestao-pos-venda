/**
 * vitest.config.ts — Testes automáticos do frontend (Etapa 11)
 *
 * Rodar:  npm run test        (uma vez, como no "npm run check")
 *         npm run test:watch  (fica observando e roda de novo a cada mudança)
 *
 * Por enquanto os testes cobrem as funções de src/lib/ (regras puras, sem
 * desenhar componentes), então o ambiente é o Node, sem navegador simulado.
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
