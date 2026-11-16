/**
 * lib/datas.test.ts — Datas "só dia" (Etapa 11)
 *
 * Confere que datas inexistentes são recusadas e que nenhuma conversão de
 * fuso "volta um dia" (o erro clássico com o horário do Maranhão, UTC−3).
 */

import { describe, expect, it } from "vitest";
import { diaBR, hoje, paraDia, REGEX_DIA, somarDias } from "./datas.js";

describe("paraDia", () => {
  it("converte AAAA-MM-DD em meia-noite UTC", () => {
    expect(paraDia("2026-11-16")?.toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });

  it("recusa datas que não existem no calendário", () => {
    expect(paraDia("2026-02-31")).toBeNull();
    expect(paraDia("2026-13-01")).toBeNull();
    expect(paraDia("2025-02-29")).toBeNull(); // 2025 não é bissexto
    expect(paraDia("2028-02-29")).not.toBeNull(); // 2028 é
  });

  it("recusa outros formatos", () => {
    expect(paraDia("16/11/2026")).toBeNull();
    expect(paraDia("2026-11-16T10:00")).toBeNull();
    expect(paraDia("")).toBeNull();
  });
});

describe("somarDias", () => {
  it("atravessa fim de mês e de ano", () => {
    expect(somarDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("diaBR", () => {
  it("mostra o mesmo dia gravado, sem voltar um dia pelo fuso", () => {
    expect(diaBR(new Date("2026-11-16T00:00:00.000Z"))).toBe("16/11/2026");
  });

  it("vazio quando não há data", () => {
    expect(diaBR(null)).toBe("");
    expect(diaBR(undefined)).toBe("");
  });
});

describe("hoje", () => {
  it("devolve AAAA-MM-DD", () => {
    expect(hoje()).toMatch(REGEX_DIA);
  });
});
