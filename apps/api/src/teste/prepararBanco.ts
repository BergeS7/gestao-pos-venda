/**
 * teste/prepararBanco.ts — Prepara o banco de TESTES antes dos testes de rotas
 *
 * Configurado em vitest.config.ts (globalSetup): roda UMA vez, antes de todos
 * os arquivos de teste. Só faz algo se DATABASE_URL_TESTE estiver definida.
 *
 * Passos:
 *  1. Confere que o nome do banco termina em "_teste" (trava de segurança:
 *     o passo 3 APAGA todos os dados, então nunca pode apontar para o banco
 *     de desenvolvimento ou de produção);
 *  2. Cria o banco, se ainda não existir (o usuário do banco local tem
 *     permissão CREATEDB, dada por scripts/setup-db-local.ps1);
 *  3. Aplica as migrações (prisma migrate deploy) e esvazia todas as tabelas;
 *  4. Roda o seed (dados fictícios), com a senha SENHA_TESTE.
 *
 * Assim cada rodada começa do mesmo estado, conhecido pelos testes.
 */

import "dotenv/config"; // DATABASE_URL_TESTE vem do apps/api/.env (localmente)
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { SENHA_TESTE } from "./ambiente.js";

/** Pasta apps/api (onde ficam o prisma.config.ts e o package.json). */
const PASTA_API = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default async function prepararBanco(): Promise<void> {
  const url = process.env.DATABASE_URL_TESTE;
  if (!url) {
    console.log("[testes] DATABASE_URL_TESTE não definida: testes de rotas serão pulados.");
    return;
  }

  // 1. Trava de segurança
  const endereco = new URL(url);
  const banco = decodeURIComponent(endereco.pathname.slice(1));
  if (!banco.endsWith("_teste")) {
    throw new Error(
      `DATABASE_URL_TESTE aponta para "${banco}". O nome do banco de testes precisa terminar em "_teste".`,
    );
  }

  // 2. Cria o banco se não existir (conectando ao banco "postgres", que sempre existe)
  const admin = new URL(url);
  admin.pathname = "/postgres";
  admin.search = "";
  const cliente = new pg.Client({ connectionString: admin.toString() });
  await cliente.connect();
  const existe = await cliente.query("SELECT 1 FROM pg_database WHERE datname = $1", [banco]);
  if (existe.rowCount === 0) {
    // Nome validado acima; aspas duplas protegem o identificador
    await cliente.query(`CREATE DATABASE "${banco.replaceAll('"', "")}" ENCODING 'UTF8'`);
    console.log(`[testes] Banco ${banco} criado.`);
  }
  await cliente.end();

  // 3. Migrações + tabelas vazias
  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: "test", SEED_SENHA: SENHA_TESTE };
  execSync("npx prisma migrate deploy", { cwd: PASTA_API, env, stdio: "pipe" });

  const conexao = new pg.Client({ connectionString: url });
  await conexao.connect();
  const tabelas = await conexao.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  const lista = tabelas.rows.map((t) => `"${t.tablename}"`).join(", ");
  if (lista) await conexao.query(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
  await conexao.end();

  // 4. Dados fictícios
  execSync("npx tsx prisma/seed.ts", { cwd: PASTA_API, env, stdio: "pipe" });
  console.log(`[testes] Banco ${banco} pronto (migrações + seed).`);
}
