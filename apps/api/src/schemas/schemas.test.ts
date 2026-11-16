/**
 * schemas/schemas.test.ts — Validação das entradas mais sensíveis (Etapa 11)
 *
 *  - Registrar contato: as regras que a planilha não tinha (Etapa 8).
 *  - Senha nova e e-mail de login (Etapa 9).
 *  - Filtros do relatório (Etapa 10).
 */

import { describe, expect, it } from "vitest";
import { hoje, somarDias } from "../lib/datas.js";
import { registrarTentativaSchema } from "./atendimentos.js";
import { loginSchema, novaSenhaSchema, trocarSenhaSchema } from "./auth.js";
import { relatorioSchema } from "./relatorios.js";

/** Campos com erro numa validação que falhou (vazio = passou). */
function erros(resultado: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return resultado.success ? [] : resultado.error!.issues.map((i) => String(i.path[0] ?? ""));
}

describe("registrar contato", () => {
  const amanha = somarDias(hoje(), 1);
  const base = { versao: 1, conseguiuFalar: true };

  it("agendou: exige data, ter falado e nenhum motivo", () => {
    expect(erros(registrarTentativaSchema.safeParse({ ...base, resultado: "SIM", dataAgendada: amanha }))).toEqual([]);
    expect(erros(registrarTentativaSchema.safeParse({ ...base, resultado: "SIM" }))).toEqual(["dataAgendada"]);
    expect(
      erros(
        registrarTentativaSchema.safeParse({ ...base, conseguiuFalar: false, resultado: "SIM", dataAgendada: amanha }),
      ),
    ).toEqual(["resultado"]);
    expect(
      erros(registrarTentativaSchema.safeParse({ ...base, resultado: "SIM", dataAgendada: amanha, motivoId: 3 })),
    ).toEqual(["motivoId"]);
  });

  it("não agendou ou retornar: exige motivo", () => {
    expect(erros(registrarTentativaSchema.safeParse({ ...base, resultado: "NAO" }))).toEqual(["motivoId"]);
    expect(erros(registrarTentativaSchema.safeParse({ ...base, resultado: "RETORNAR", motivoId: 1 }))).toEqual([]);
  });

  it("datas: recusa passado, data inexistente e mais de 1 ano à frente", () => {
    const tentar = (dataAgendada: string) =>
      erros(registrarTentativaSchema.safeParse({ ...base, resultado: "SIM", dataAgendada }));
    expect(tentar(somarDias(hoje(), -1))).toContain("dataAgendada");
    expect(tentar("2026-02-31")).toContain("dataAgendada");
    expect(tentar(somarDias(hoje(), 366))).toContain("dataAgendada");
    expect(tentar(hoje())).toEqual([]);
  });

  it("observação só com espaços conta como vazia", () => {
    const r = registrarTentativaSchema.safeParse({ ...base, resultado: "NAO", motivoId: 2, observacoes: "   " });
    expect(r.success && r.data.observacoes).toBe(undefined);
  });
});

describe("senha e login", () => {
  it("senha nova: 8+ caracteres, com letra e número, até 72", () => {
    expect(novaSenhaSchema.safeParse("abc12345").success).toBe(true);
    expect(novaSenhaSchema.safeParse("abc1234").success).toBe(false); // curta
    expect(novaSenhaSchema.safeParse("abcdefgh").success).toBe(false); // sem número
    expect(novaSenhaSchema.safeParse("12345678").success).toBe(false); // sem letra
    expect(novaSenhaSchema.safeParse("a1".repeat(37)).success).toBe(false); // 74 caracteres
  });

  it("nova senha precisa ser diferente da atual", () => {
    expect(erros(trocarSenhaSchema.safeParse({ senhaAtual: "abc12345", novaSenha: "abc12345" }))).toEqual([
      "novaSenha",
    ]);
  });

  it("e-mail do login sem espaços e em minúsculo", () => {
    const r = loginSchema.safeParse({ email: "  Gestor@Exemplo.Local ", senha: "x" });
    expect(r.success && r.data.email).toBe("gestor@exemplo.local");
  });
});

describe("filtros do relatório", () => {
  it("sem mês usa o mês atual; formato AAAA-MM", () => {
    expect(relatorioSchema.parse({}).mes).toBe(hoje().slice(0, 7));
    expect(relatorioSchema.safeParse({ mes: "2026-13" }).success).toBe(false);
    expect(relatorioSchema.parse({ mes: "2026-10", unidade: "sti" }).unidade).toBe("STI");
  });
});
