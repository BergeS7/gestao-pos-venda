/**
 * services/relatorios.test.ts — Confere o relatório de produção com um mês feito à mão
 *
 * "Pronto quando" da Etapa 10: o relatório de um mês fictício bate com o
 * cálculo feito à mão. Abaixo está o mês de outubro/2026 inventado, as contas
 * feitas à mão (nos comentários) e a comparação com montarRelatorio().
 *
 * Como rodar (na pasta apps/api):  npm run test
 * Usa o executor de testes que já vem no Node (node:test), sem banco.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { intervaloDoMes, montarRelatorio, type LigacaoRelatorio } from "./relatorios.js";

// ---------------------------------------------------------------------------
// Mês fictício (nomes inventados)
// ---------------------------------------------------------------------------

const ANA = { id: 1, nome: "Ana Exemplo" };
const BIA = { id: 2, nome: "Bia Exemplo" };
const STI = { sigla: "STI", nome: "Santa Inês" };
const ZDC = { sigla: "ZDC", nome: "Zé Doca" };

/** Monta uma ligação. `dia` é o dia de outubro, às 10h do Maranhão (13h UTC). */
function ligacao(
  revisaoId: number,
  dia: number,
  usuario: typeof ANA,
  unidade: typeof STI,
  conseguiuFalar: boolean,
  resultado: LigacaoRelatorio["resultado"],
  concluida = false,
  motivo: string | null = null,
): LigacaoRelatorio {
  return {
    revisaoId,
    criadoEm: new Date(Date.UTC(2026, 9, dia, 13)),
    conseguiuFalar,
    resultado,
    motivo,
    usuario,
    revisao: { concluida, unidade },
  };
}

const MECANICO = "Mecânico de confiança";
const RETORNAR = "Retornar depois";

/*
 * Revisão | Ligações no mês                                  | Conta para
 * --------|--------------------------------------------------|---------------------------------------------
 * R1 STI  | Ana não falou; Ana falou e agendou (concluída)   | Ana/STI: total, falou, agendado, concluído
 * R2 STI  | Ana falou, não agendou (mecânico)                | Ana/STI: total, falou; causa mecânico
 * R3 STI  | Ana não falou                                    | Ana/STI: total
 * R4 ZDC  | Ana falou e agendou (ainda não veio)             | Ana/ZDC: total, falou, agendado
 * R5 STI  | Bia falou, pediu retorno                         | Bia/STI: total, falou; causa retornar
 * R6 STI  | Ana não falou; Bia falou e agendou (concluída)   | Bia/STI (última ligação é da Bia): tudo
 * R7 ZDC  | Bia falou "distante"; depois falou "mecânico"    | Bia/ZDC: total, falou; causa = a ÚLTIMA (mecânico)
 * R8 ZDC  | Bia não falou; Bia falou e agendou (concluída)   | Bia/ZDC: tudo
 * R10 ZDC | Bia não falou, 31/10 às 23:59 do Maranhão        | Bia/ZDC: total (ainda é outubro no Maranhão)
 * R9      | ligação em setembro                              | fora
 * R11     | 30/09 às 23:59 do Maranhão (já 01/10 em UTC)      | fora (ainda é setembro no Maranhão)
 */
const ligacoes: LigacaoRelatorio[] = [
  ligacao(1, 2, ANA, STI, false, "RETORNAR", true),
  ligacao(1, 5, ANA, STI, true, "SIM", true),
  ligacao(2, 3, ANA, STI, true, "NAO", false, MECANICO),
  ligacao(3, 3, ANA, STI, false, "RETORNAR"),
  ligacao(4, 4, ANA, ZDC, true, "SIM"),
  ligacao(5, 6, BIA, STI, true, "RETORNAR", false, RETORNAR),
  ligacao(6, 7, ANA, STI, false, "RETORNAR", true),
  ligacao(6, 9, BIA, STI, true, "SIM", true),
  ligacao(7, 8, BIA, ZDC, true, "NAO", false, "Distante"),
  ligacao(7, 20, BIA, ZDC, true, "NAO", false, MECANICO),
  ligacao(8, 10, BIA, ZDC, false, "RETORNAR", true),
  ligacao(8, 12, BIA, ZDC, true, "SIM", true),
  // 31/10 às 23:59 no Maranhão = 01/11 às 02:59 UTC
  { ...ligacao(10, 1, BIA, ZDC, false, "RETORNAR"), criadoEm: new Date("2026-11-01T02:59:00Z") },
];

/** O serviço recebe só as ligações dentro do mês (o banco filtra por data). */
const { inicio, fim } = intervaloDoMes("2026-10");
const foraDoMes: LigacaoRelatorio[] = [
  { ...ligacao(9, 1, ANA, STI, true, "SIM"), criadoEm: new Date("2026-09-15T13:00:00Z") },
  // 30/09 às 23:59 no Maranhão = 01/10 às 02:59 UTC
  { ...ligacao(11, 1, ANA, STI, true, "SIM"), criadoEm: new Date("2026-10-01T02:59:00Z") },
];
const doMes = [...ligacoes, ...foraDoMes].filter((l) => l.criadoEm >= inicio && l.criadoEm < fim);

/** Só os 4 números brutos de uma contagem, para comparar com a conta à mão. */
const numeros = (c: { total: number; falou: number; agendados: number; concluidos: number }) => [
  c.total,
  c.falou,
  c.agendados,
  c.concluidos,
];

// ---------------------------------------------------------------------------
// Conferência
// ---------------------------------------------------------------------------

describe("relatório de produção (outubro/2026 fictício)", () => {
  const r = montarRelatorio("2026-10", doMes);

  it("o mês vai de 01/10 00:00 a 31/10 23:59 no horário do Maranhão", () => {
    assert.equal(inicio.toISOString(), "2026-10-01T03:00:00.000Z");
    assert.equal(fim.toISOString(), "2026-11-01T03:00:00.000Z");
    assert.equal(doMes.length, ligacoes.length); // R9 e R11 ficaram fora
  });

  it("operadora × unidade bate com a conta à mão", () => {
    // [total, falou, agendados, concluídos]
    assert.deepEqual(
      r.linhas.map((l) => [l.operadora.nome, l.unidade.sigla, ...numeros(l)]),
      [
        ["Ana Exemplo", "STI", 3, 2, 1, 1], // R1, R2, R3
        ["Ana Exemplo", "ZDC", 1, 1, 1, 0], // R4
        ["Bia Exemplo", "STI", 2, 2, 1, 1], // R5, R6
        ["Bia Exemplo", "ZDC", 3, 2, 1, 1], // R7, R8, R10
      ],
    );
  });

  it("totais por unidade, por operadora e geral", () => {
    assert.deepEqual(r.porUnidade.map((u) => [u.unidade.sigla, ...numeros(u)]), [
      ["STI", 5, 4, 2, 2],
      ["ZDC", 4, 3, 2, 1],
    ]);
    assert.deepEqual(r.porOperadora.map((o) => [o.operadora.nome, ...numeros(o)]), [
      ["Ana Exemplo", 4, 3, 2, 1],
      ["Bia Exemplo", 5, 4, 2, 2],
    ]);
    assert.deepEqual(numeros(r.total), [9, 7, 4, 3]);
    assert.equal(r.total.naoFalou, 2);
  });

  it("taxas (rankings)", () => {
    assert.equal(r.total.taxaContato, 7 / 9); // falou ÷ total
    assert.equal(r.total.taxaAgendamento, 4 / 7); // agendados ÷ falou
    assert.equal(r.total.taxaConclusao, 3 / 4); // concluídos ÷ agendados
    assert.equal(r.total.taxaConcluidosBase, 3 / 9); // concluídos ÷ total
    // Divisor zero vira null (a tela mostra "—")
    const anaZdc = r.linhas.find((l) => l.operadora.id === 1 && l.unidade.sigla === "ZDC")!;
    assert.equal(anaZdc.taxaConclusao, 0);
    assert.equal(montarRelatorio("2026-10", []).total.taxaContato, null);
  });

  it("causas: motivo da última ligação em que falou; soma = falou − agendados", () => {
    assert.deepEqual(
      r.causas.map((c) => [c.operadora.nome, c.unidade.sigla, c.motivo, c.quantidade]),
      [
        ["Ana Exemplo", "STI", MECANICO, 1],
        ["Bia Exemplo", "STI", RETORNAR, 1],
        ["Bia Exemplo", "ZDC", MECANICO, 1], // R7: "Distante" foi substituído
      ],
    );
    assert.deepEqual(
      r.causasResumo.map((c) => [c.motivo, c.quantidade]),
      [
        [MECANICO, 2],
        [RETORNAR, 1],
      ],
    );
    assert.equal(r.causasResumo[0].percentual, 2 / 3);
    const soma = r.causas.reduce((s, c) => s + c.quantidade, 0);
    assert.equal(soma, r.total.falou - r.total.agendados);
  });

  it("filtro de operadora considera quem fez a última ligação", () => {
    const soAna = montarRelatorio("2026-10", doMes, ANA.id);
    assert.deepEqual(numeros(soAna.total), [4, 3, 2, 1]); // R6 é da Bia, mesmo com ligação da Ana
    assert.equal(soAna.porOperadora.length, 1);
  });
});
