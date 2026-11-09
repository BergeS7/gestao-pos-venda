/**
 * vite.config.ts — Configuração do Vite (servidor de desenvolvimento e build)
 *
 * O Vite compila o TypeScript/JSX e o Sass, serve o frontend em
 * desenvolvimento (com recarga instantânea) e gera a versão de produção (`dist/`).
 * Documentação: https://vite.dev/config/
 */

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Suporte a React (JSX e recarga rápida dos componentes)
  plugins: [react()],

  server: {
    // Porta fixa: a API libera o CORS exatamente para http://localhost:5173
    port: 5173,

    // Proxy: em desenvolvimento, toda chamada para /api é repassada para a
    // API Express (apps/api). Assim o frontend chama "/api/health" como se
    // fosse o mesmo endereço, sem precisar saber a porta da API.
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        // O Bootstrap 5.3 ainda usa @import e funções antigas do Sass, que
        // geram avisos de depreciação a cada compilação. Os avisos vêm de
        // dentro do Bootstrap (não do nosso código), então são silenciados.
        // Revisar quando o Bootstrap migrar para o novo sistema de módulos (@use).
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
})
