/**
 * server.ts — Ponto de entrada da API
 *
 * É o arquivo que o Node executa (`npm run dev` ou `npm start`).
 * Pega o app já montado em `app.ts` e o coloca para escutar na porta configurada.
 *
 * Observação: os imports terminam em `.js` mesmo os arquivos sendo `.ts`.
 * É exigência do modo ESM do Node (module "NodeNext" no tsconfig): o caminho
 * precisa apontar para o arquivo compilado que vai existir em `dist/`.
 */

import { app } from "./app.js";
import { config } from "./config.js";

app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}/api/health`);
});
