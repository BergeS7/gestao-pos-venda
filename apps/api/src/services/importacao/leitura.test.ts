/**
 * services/importacao/leitura.test.ts — Leitura de XLSX e CSV (Etapa 6)
 */

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { chaveDoTitulo, COLUNAS_ESPELHAMENTO, lerPlanilha, OBRIGATORIAS_ESPELHAMENTO } from "./leitura.js";

const ler = (buffer: Buffer, nome: string) =>
  lerPlanilha(buffer, nome, COLUNAS_ESPELHAMENTO, OBRIGATORIAS_ESPELHAMENTO);

describe("lerPlanilha", () => {
  it("títulos com acento e pontuação viram a mesma chave", () => {
    expect(chaveDoTitulo("Tipo O.S.")).toBe("tipoos");
    expect(chaveDoTitulo("Código Assistência Técnica")).toBe("codigoassistenciatecnica");
  });

  it("CSV em Latin-1 (Excel no Windows) com ';' e título acima do cabeçalho", async () => {
    const texto =
      "Relatório de OS\r\nChassi;Tipo O.S.;Código Assistência Técnica\r\n9C2KC2200TR000001;1ª REVISÃO;10\r\n";
    const linhas = await ler(Buffer.from(texto, "latin1"), "espelho.csv");
    expect(linhas).toEqual([
      { numero: 3, valores: { chassi: "9C2KC2200TR000001", tipoOs: "1ª REVISÃO", codigoAssistencia: "10" } },
    ]);
  });

  it("XLSX: lê a primeira aba, pula linhas vazias e usa o resultado de fórmulas", async () => {
    const livro = new ExcelJS.Workbook();
    const aba = livro.addWorksheet("Plan1");
    aba.addRow(["ESPELHAMENTO"]);
    aba.addRow(["Chassi", "Tipo O.S."]);
    aba.addRow(["9C2KC2200TR000001", { formula: '"2ª REVISÃO"', result: "2ª REVISÃO" }]);
    aba.addRow([]);
    aba.addRow(["9C2KC2200TR000002", "REVISÃO PERIÓDICA"]);
    const buffer = Buffer.from(await livro.xlsx.writeBuffer());
    const linhas = await ler(buffer, "espelho.xlsx");
    expect(linhas.map((l) => [l.numero, l.valores.tipoOs])).toEqual([
      [3, "2ª REVISÃO"],
      [5, "REVISÃO PERIÓDICA"],
    ]);
  });

  it("sem o cabeçalho esperado, explica quais colunas faltam", async () => {
    await expect(ler(Buffer.from("Nome;Idade\nA;1\n"), "x.csv")).rejects.toThrow(/chassi, tipoOs/);
  });

  it("recusa formato desconhecido", async () => {
    await expect(ler(Buffer.from("x"), "x.pdf")).rejects.toThrow(/formato não aceito/);
  });
});
