/**
 * services/importacao/normalizar.test.ts — Limpeza dos valores importados (Etapa 6)
 */

import { describe, expect, it } from "vitest";
import {
  chassiValido,
  normalizarCelular,
  normalizarChassi,
  normalizarCpf,
  normalizarData,
  normalizarKm,
  normalizarMunicipio,
  normalizarRevisoes,
} from "./normalizar.js";

describe("normalização", () => {
  it("chassi: sem espaço/traço, maiúsculo; VIN sem I, O e Q", () => {
    expect(normalizarChassi(" 9c2 kc22-00tr000001 ")).toBe("9C2KC2200TR000001");
    expect(chassiValido("9C2KC2200TR000001")).toBe(true);
    expect(chassiValido("9C2KC2200TR00000")).toBe(false); // 16
    expect(chassiValido("9C2KC2200TO000001")).toBe(false); // letra O
  });

  it("CPF/CNPJ só com dígitos; número do Excel recupera o zero da frente", () => {
    expect(normalizarCpf("000.000.000-01")).toBe("00000000001");
    expect(normalizarCpf(12345678901)).toBe("12345678901");
    expect(normalizarCpf(1)).toBe("00000000001");
    expect(normalizarCpf("12.345.678/0001-99")).toBe("12345678000199");
    expect(normalizarCpf("123")).toBeNull();
  });

  it("celular: DDD + número, sem 55 e sem 0 da operadora", () => {
    expect(normalizarCelular("(98) 900000001")).toBe("98900000001");
    expect(normalizarCelular("+55 98 90000-0001")).toBe("98900000001");
    expect(normalizarCelular("098900000001")).toBe("98900000001");
    expect(normalizarCelular("123")).toBeNull();
  });

  it("município sem /MA", () => {
    expect(normalizarMunicipio("Santa Inês/MA")).toBe("SANTA INÊS");
    expect(normalizarMunicipio("ZÉ DOCA - MA")).toBe("ZÉ DOCA");
    expect(normalizarMunicipio("PIO XII")).toBe("PIO XII");
  });

  it("km em vários formatos", () => {
    expect(normalizarKm("1.000")).toBe(1000);
    expect(normalizarKm("6000 KM")).toBe(6000);
    expect(normalizarKm(12000)).toBe(12000);
    expect(normalizarKm("")).toBeNull();
  });

  it("data da venda: texto ISO, brasileiro, Date e número de série do Excel", () => {
    expect(normalizarData("2026-07-29 12:02:58")).toBe("2026-07-29");
    expect(normalizarData("29/07/2026")).toBe("2026-07-29");
    expect(normalizarData(new Date(Date.UTC(2026, 6, 29)))).toBe("2026-07-29");
    expect(normalizarData(46232)).toBe("2026-07-29");
    expect(normalizarData("31/02/2026")).toBeNull();
    expect(normalizarData("pendente")).toBeNull();
  });
});

describe("normalizarRevisoes", () => {
  it("separa válidas e inválidas, com motivos e avisos", () => {
    const { validas, invalidas } = normalizarRevisoes([
      {
        numero: 2,
        valores: { nome: "Maria", chassi: "9C2KC2200TR000001", modelo: "CG 160", km: "1000", celular: "x" },
      },
      { numero: 3, valores: { nome: "", chassi: "123", modelo: "CG", km: "5000" } },
    ]);
    expect(validas).toHaveLength(1);
    expect(validas[0]).toMatchObject({ nome: "MARIA", celular: null, km: 1000 });
    expect(validas[0].avisos).toContain("Celular não reconhecido: ficou vazio");
    expect(invalidas[0].numero).toBe(3);
    expect(invalidas[0].motivos).toEqual([
      "Sem nome do cliente",
      "Chassi inválido (3 caracteres; precisa de 17)",
      "Km 5000 não é uma revisão (1000, 6000, 12000, 18000)",
    ]);
  });
});
