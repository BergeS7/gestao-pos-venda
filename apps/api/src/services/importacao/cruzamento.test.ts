/**
 * services/importacao/cruzamento.test.ts — A regra de cruzamento por chassi (Etapa 6)
 *
 * Usa os arquivos FICTÍCIOS de db/seed/ (ver db/seed/README.md, com os números
 * esperados). O "banco" é simulado com o que o seed de desenvolvimento tem:
 * a revisão de 6000 km do 9C2TST0000T000001 já está na fila.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  agruparOs,
  classificarRevisoes,
  conclusoesAutomaticas,
  kmsDoTipoOs,
  unidadeDoMunicipio,
  type ContextoCruzamento,
} from "./cruzamento.js";
import {
  COLUNAS_ESPELHAMENTO,
  COLUNAS_REVISOES,
  lerPlanilha,
  OBRIGATORIAS_ESPELHAMENTO,
  OBRIGATORIAS_REVISOES,
} from "./leitura.js";
import { normalizarEspelhamento, normalizarRevisoes, type Normalizado, type OsImportada } from "./normalizar.js";

/** Pasta db/seed na raiz do repositório. */
const PASTA_EXEMPLOS = resolve(import.meta.dirname, "../../../../../db/seed");
const arquivo = (nome: string) => readFileSync(resolve(PASTA_EXEMPLOS, nome));

/** Lê e normaliza os dois arquivos de exemplo. */
async function exemplos() {
  const revisoes = normalizarRevisoes(
    await lerPlanilha(arquivo("lista-revisoes-exemplo.csv"), "lista.csv", COLUNAS_REVISOES, OBRIGATORIAS_REVISOES),
  );
  const espelho = normalizarEspelhamento(
    await lerPlanilha(arquivo("espelhamento-exemplo.csv"), "esp.csv", COLUNAS_ESPELHAMENTO, OBRIGATORIAS_ESPELHAMENTO),
  );
  return { revisoes, espelho };
}

/** Contexto que imita o banco do seed + as OS do espelhamento enviado. */
function contexto(espelho: Normalizado<OsImportada>, exigirTipoOs: boolean): ContextoCruzamento {
  return {
    jaNaFila: new Set(["9C2TST0000T000001|6000"]),
    chassisAnonimizados: new Set(),
    osPorChassi: agruparOs(espelho.validas.map((o) => ({ chassi: o.chassi, tipoOs: o.tipoOs, origem: "arquivo" }))),
    exigirTipoOs,
  };
}

describe("tipo de OS → km", () => {
  it.each([
    ["1ª REVISÃO EXPRESSO", [1000]],
    ["1ª REVISÃO - VOLANTE", [1000]],
    ["2ª REVISÃO PACOTE", [6000]],
    ["REVISÃO PERIÓDICA - VOLANTE", [12000, 18000]],
    ["EXTERNO - PACOTE", null],
  ])("%s", (tipo, kms) => {
    expect(kmsDoTipoOs(tipo)).toEqual(kms);
  });
});

describe("unidade pelo município (provisório)", () => {
  it("com e sem acento; fora da tabela fica sem unidade", () => {
    expect(unidadeDoMunicipio("SANTA INÊS")).toBe("STI");
    expect(unidadeDoMunicipio("ZE DOCA")).toBe("ZDC");
    expect(unidadeDoMunicipio("CODÓ")).toBeNull();
  });
});

describe("cruzamento com os arquivos fictícios de db/seed", () => {
  it("lê e valida: 15 linhas, 3 inválidas; espelhamento com 1 inválida", async () => {
    const { revisoes, espelho } = await exemplos();
    expect(revisoes.validas.length + revisoes.invalidas.length).toBe(15);
    expect(revisoes.invalidas.map((l) => l.numero)).toEqual([13, 14, 15]);
    expect(espelho.validas).toHaveLength(5);
    expect(espelho.invalidas[0].chassi).toBe("ABC123");
    // Linha 16 só entra porque a normalização arrumou chassi, km e município
    expect(revisoes.validas.find((r) => r.numero === 16)).toMatchObject({
      chassi: "9C2EXP00000R00110",
      km: 1000,
      municipio: "PIO XII",
      nome: "HELENA EXEMPLO ONZE",
    });
  });

  it("só por chassi (padrão): 3 com OS, 7 elegíveis", async () => {
    const { revisoes, espelho } = await exemplos();
    const c = classificarRevisoes(revisoes.validas, contexto(espelho, false));
    expect(c.duplicadas.map((r) => r.numero)).toEqual([11]);
    expect(c.jaNaFila.map((r) => r.chassi)).toEqual(["9C2TST0000T000001"]);
    expect(c.comOs.map((r) => r.chassi.slice(-3))).toEqual(["103", "104", "105"]);
    expect(c.elegiveis).toHaveLength(7);
    expect(c.elegiveis.filter((r) => !unidadeDoMunicipio(r.municipio)).map((r) => r.municipio)).toEqual(["CODÓ"]);
  });

  it("exigindo tipo de OS = km: só a OS de 1ª revisão × 1000 km tira; 9 elegíveis", async () => {
    const { revisoes, espelho } = await exemplos();
    const c = classificarRevisoes(revisoes.validas, contexto(espelho, true));
    expect(c.comOs.map((r) => r.chassi.slice(-3))).toEqual(["103"]);
    expect(c.elegiveis).toHaveLength(9);
  });

  it("OS de importação anterior só conta se o tipo corresponde ao km", async () => {
    const { revisoes } = await exemplos();
    const ctx: ContextoCruzamento = {
      jaNaFila: new Set(),
      chassisAnonimizados: new Set(),
      // 1ª revisão já feita (no banco): tira a linha de 1000 km do …00102, não a de 6000 km
      osPorChassi: agruparOs([{ chassi: "9C2EXP00000R00102", tipoOs: "1ª REVISÃO EXPRESSO", origem: "banco" }]),
      exigirTipoOs: false,
    };
    const c = classificarRevisoes(revisoes.validas, ctx);
    expect(c.comOs.map((r) => `${r.chassi.slice(-3)}|${r.km}`)).toEqual(["102|1000"]);
  });

  it("moto de cliente anonimizado não volta (LGPD)", async () => {
    const { revisoes } = await exemplos();
    const c = classificarRevisoes(revisoes.validas, {
      jaNaFila: new Set(),
      chassisAnonimizados: new Set(["9C2EXP00000R00106"]),
      osPorChassi: new Map(),
      exigirTipoOs: false,
    });
    expect(c.anonimizados.map((r) => r.chassi)).toEqual(["9C2EXP00000R00106"]);
  });

  it("conclusão automática: OS do mesmo km conclui; outro km ou tipo desconhecido, não", async () => {
    const { espelho } = await exemplos();
    const abertas = [
      { id: 4, chassi: "9C2TST0000T000004", km: 1000 },
      { id: 8, chassi: "9C2TST0000T000008", km: 1000 },
      { id: 5, chassi: "9C2EXP00000R00105", km: 1000 },
    ];
    expect(conclusoesAutomaticas(abertas, espelho.validas).map((c) => c.id)).toEqual([4]);
  });
});
