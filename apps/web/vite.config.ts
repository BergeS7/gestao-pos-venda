import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Encaminha /api para a API Express (apps/api), evitando problemas de CORS
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // O Bootstrap 5.3 ainda usa @import e funções antigas do Sass.
        // Isto esconde os avisos de depreciação que vêm de dentro dele.
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
})
