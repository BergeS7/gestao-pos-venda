/**
 * prisma.config.ts — Configuração do Prisma CLI (Prisma 7)
 *
 * Lido pelos comandos `npx prisma ...` (migrate, generate, studio, db seed).
 * Diz ao Prisma:
 *  - onde está o schema (definição das tabelas);
 *  - onde ficam as migrações (histórico de alterações do banco);
 *  - como rodar o seed (dados iniciais fictícios);
 *  - qual banco usar (DATABASE_URL do .env).
 *
 * Documentação: https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */

// Carrega o .env: o Prisma 7 não lê o .env sozinho.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Comando executado por `npx prisma db seed`
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
