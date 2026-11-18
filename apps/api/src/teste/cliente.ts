/**
 * teste/cliente.ts — Cliente HTTP para os testes de rotas
 *
 * Liga a API (o mesmo `app` do server.ts) numa porta livre e oferece:
 *  - `req()`: faz uma requisição, opcionalmente com o cookie de sessão;
 *  - `entrar()`: faz login e devolve o cookie, como o navegador guardaria.
 *
 * Usa o fetch do próprio Node, sem bibliotecas extras. O `app` é importado
 * dentro de `iniciarApi()` (import dinâmico) para que um arquivo de teste
 * pulado (sem banco de testes) não carregue a conexão com o banco.
 */

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SENHA_TESTE } from "./ambiente.js";

/** E-mails dos usuários fictícios criados pelo seed (prisma/seed.ts). */
export const USUARIOS_TESTE = {
  admin: "admin@exemplo.local",
  diretoria: "diretoria@exemplo.local",
  gestor: "gestor@exemplo.local",
  operadoraA: "operadora.a@exemplo.local",
  operadoraB: "operadora.b@exemplo.local",
} as const;

/**
 * Corpo de resposta sem tipo definido. Nos testes, o `expect` é que confere o
 * formato; exigir um tipo para cada resposta só deixaria os testes mais longos.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type CorpoQualquer = any;

/** Resposta simplificada: código HTTP, corpo (JSON ou texto) e cabeçalhos. */
export type Resposta<T = CorpoQualquer> = { status: number; corpo: T; headers: Headers };

let servidor: Server | undefined;
let base = "";

/** Liga a API numa porta livre (porta 0 = o sistema escolhe). */
export async function iniciarApi(): Promise<void> {
  const { app } = await import("../app.js");
  await new Promise<void>((ok) => {
    servidor = app.listen(0, () => ok());
  });
  base = `http://127.0.0.1:${(servidor!.address() as AddressInfo).port}`;
}

/** Desliga a API e fecha a conexão com o banco. */
export async function pararApi(): Promise<void> {
  await new Promise<void>((ok) => (servidor ? servidor.close(() => ok()) : ok()));
  const { prisma } = await import("../db/prisma.js");
  await prisma.$disconnect();
}

/**
 * Faz uma requisição à API.
 * @param cookie cookie de sessão devolvido por `entrar()` (omitir = sem login)
 */
export async function req<T = CorpoQualquer>(
  metodo: string,
  caminho: string,
  opcoes: { cookie?: string; corpo?: unknown } = {},
): Promise<Resposta<T>> {
  const headers: Record<string, string> = {};
  if (opcoes.cookie) headers.cookie = opcoes.cookie;
  if (opcoes.corpo !== undefined) headers["content-type"] = "application/json";
  const r = await fetch(base + caminho, {
    method: metodo,
    headers,
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  });
  const texto = await r.text();
  const tipo = r.headers.get("content-type") ?? "";
  return { status: r.status, corpo: tipo.includes("json") ? JSON.parse(texto) : texto, headers: r.headers };
}

/** Faz login e devolve o cookie de sessão ("sessao=..."). */
export async function entrar(email: string, senha = SENHA_TESTE): Promise<string> {
  const r = await req("POST", "/api/auth/login", { corpo: { email, senha } });
  if (r.status !== 200) throw new Error(`Login de ${email} falhou: ${r.status} ${JSON.stringify(r.corpo)}`);
  const cookie = r.headers.get("set-cookie") ?? "";
  return cookie.split(";")[0];
}
