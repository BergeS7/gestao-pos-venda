/**
 * lib/formatar.test.ts — Formatos para pessoas (LGPD: documento mascarado)
 */

import { describe, expect, it } from "vitest";
import { celularBR, documentoMascarado } from "./formatar.js";

describe("documentoMascarado", () => {
  it("mostra só o miolo do CPF e do CNPJ", () => {
    expect(documentoMascarado("12345678901")).toBe("***.456.789-**");
    expect(documentoMascarado("12345678000199")).toBe("**.***.678/0001-**");
  });

  it("vazio ou formato estranho não vaza o número", () => {
    expect(documentoMascarado(null)).toBe("");
    expect(documentoMascarado("123")).toBe("***");
  });
});

describe("celularBR", () => {
  it("põe a máscara", () => {
    expect(celularBR("98900000001")).toBe("(98) 90000-0001");
  });
});
