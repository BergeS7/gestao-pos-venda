/**
 * lib/csv.test.ts — CSV para Excel em português (Etapa 11)
 *
 * O ponto mais importante é a proteção contra "injeção de fórmula": um nome
 * de cliente como "=HYPERLINK(...)" não pode virar fórmula quando a planilha
 * exportada for aberta no Excel.
 */

import { describe, expect, it } from "vitest";
import { gerarCsv, type ColunaCsv } from "./csv.js";

type Linha = { nome: string; qtd: number | null };
const colunas: ColunaCsv<Linha>[] = [
  { titulo: "Nome", valor: (l) => l.nome },
  { titulo: "Qtd", valor: (l) => l.qtd },
];

/** Linhas do CSV sem o BOM e sem a quebra final. */
const linhas = (csv: string) => csv.slice(1).trimEnd().split("\r\n");

describe("gerarCsv", () => {
  it("começa com BOM UTF-8 e usa ; e CRLF", () => {
    const csv = gerarCsv(colunas, [{ nome: "Ana", qtd: 2 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(linhas(csv)).toEqual(["Nome;Qtd", "Ana;2"]);
  });

  it("neutraliza fórmulas com apóstrofo", () => {
    for (const perigoso of ["=1+1", "+cmd", "-2+3", "@SOMA(A1)"]) {
      const [, valor] = linhas(gerarCsv(colunas, [{ nome: perigoso, qtd: null }]));
      expect(valor.startsWith("'")).toBe(true);
    }
  });

  it("protege separador, aspas e quebra de linha com aspas", () => {
    const [, valor] = linhas(gerarCsv(colunas, [{ nome: 'Oficina "Centro"; loja 2', qtd: 1 }]));
    expect(valor).toBe('"Oficina ""Centro""; loja 2";1');
  });

  it("valor vazio vira célula vazia", () => {
    const [, valor] = linhas(gerarCsv(colunas, [{ nome: "Bia", qtd: null }]));
    expect(valor).toBe("Bia;");
  });
});
