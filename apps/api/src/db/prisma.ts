/**
 * db/prisma.ts — Conexão única com o banco de dados
 *
 * Cria UMA instância do PrismaClient para toda a API. Boa prática: cada
 * instância abre um "pool" de conexões com o PostgreSQL; criar várias
 * esgotaria as conexões do banco.
 *
 * Prisma 7: a conexão é feita por um "driver adapter". Usamos o
 * @prisma/adapter-pg, que usa o driver oficial `pg` do Node.
 *
 * Uso nos serviços:
 *   import { prisma } from "../db/prisma.js";
 *   const unidades = await prisma.unidade.findMany();
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config.js";

const adapter = new PrismaPg({ connectionString: config.databaseUrl });

/** Cliente do banco, compartilhado por toda a API. */
export const prisma = new PrismaClient({
  adapter,
  // Em desenvolvimento, mostra avisos e erros do Prisma no terminal
  log: config.nodeEnv === "development" ? ["warn", "error"] : ["error"],
});
