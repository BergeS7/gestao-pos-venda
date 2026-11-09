/**
 * config.ts — Configurações da API
 *
 * Centraliza tudo o que vem de variáveis de ambiente (arquivo `.env`).
 * O resto do código importa `config` daqui em vez de ler `process.env`
 * diretamente. Assim:
 *  - existe um único lugar para ver quais configurações a API usa;
 *  - os valores padrão ficam documentados;
 *  - os tipos já chegam convertidos (ex.: a porta como número).
 *
 * Para mudar um valor localmente, edite `apps/api/.env`.
 * O modelo com todas as variáveis está em `apps/api/.env.example`.
 */

// Carrega o arquivo .env para dentro de process.env.
// Precisa rodar antes de qualquer leitura de process.env abaixo.
import "dotenv/config";

/** Configurações tipadas da aplicação. */
export const config = {
  /** Porta HTTP em que a API escuta. Padrão: 3333. */
  port: Number(process.env.PORT ?? 3333),

  /**
   * Endereço do frontend autorizado a chamar a API (CORS).
   * Padrão: o servidor de desenvolvimento do Vite (porta 5173).
   */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  /** Ambiente de execução: "development" ou "production". */
  nodeEnv: process.env.NODE_ENV ?? "development",
};
