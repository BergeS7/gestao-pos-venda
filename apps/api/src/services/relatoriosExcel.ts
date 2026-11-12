/**
 * services/relatoriosExcel.ts — Relatório de produção em Excel (.xlsx) (Etapa 10)
 *
 * Transforma o Relatorio (services/relatorios.ts) numa planilha com 4 abas,
 * no mesmo espírito da planilha feita à mão hoje:
 *   1. Produção     → operadora × unidade, com os números e as 4 taxas
 *   2. Por unidade  → totais de cada unidade (inclui % concluídos da base)
 *   3. Por operadora→ rankings de cada operadora
 *   4. Causas       → motivos de "falou e não agendou" por operadora × unidade
 *
 * As taxas vão como número (0,25) com formato de porcentagem, para quem
 * abrir no Excel poder somar, ordenar e fazer gráfico.
 *
 * Biblioteca: exceljs (https://github.com/exceljs/exceljs).
 * Não há dados de clientes (nome, CPF, telefone) neste arquivo: só contagens.
 */

import ExcelJS from "exceljs";
import type { Contagem, Relatorio } from "./relatorios.js";

/** Vermelho da marca (sem o "#"), usado no cabeçalho das tabelas. */
const COR_CABECALHO = "FFCC0000";

/** Colunas numéricas comuns às abas de produção. */
const COLUNAS_CONTAGEM: { titulo: string; campo: keyof Contagem; porcentagem?: boolean }[] = [
  { titulo: "Total de clientes", campo: "total" },
  { titulo: "Conseguiu falar", campo: "falou" },
  { titulo: "Não conseguiu", campo: "naoFalou" },
  { titulo: "Agendados", campo: "agendados" },
  { titulo: "Concluídos", campo: "concluidos" },
  { titulo: "% contato", campo: "taxaContato", porcentagem: true },
  { titulo: "% agendamento", campo: "taxaAgendamento", porcentagem: true },
  { titulo: "% conclusão", campo: "taxaConclusao", porcentagem: true },
  { titulo: "% concluídos da base", campo: "taxaConcluidosBase", porcentagem: true },
];

/** Nome do mês por extenso: "2026-10" → "outubro de 2026". */
export function mesPorExtenso(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano, m - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Cria uma aba com título, cabeçalho em vermelho e as linhas dadas.
 * `fixas` são as colunas de texto à esquerda (ex.: Operadora, Unidade).
 */
function criarAba(
  livro: ExcelJS.Workbook,
  nome: string,
  titulo: string,
  fixas: string[],
  colunas: { titulo: string; porcentagem?: boolean }[],
  linhas: (string | number | null)[][],
  linhaTotal?: (string | number | null)[],
) {
  const aba = livro.addWorksheet(nome, { views: [{ state: "frozen", ySplit: 3 }] });

  // Linha 1: título; linha 2 em branco; linha 3: cabeçalho
  aba.getCell("A1").value = titulo;
  aba.getCell("A1").font = { bold: true, size: 14 };

  const cabecalho = aba.getRow(3);
  [...fixas, ...colunas.map((c) => c.titulo)].forEach((t, i) => {
    const celula = cabecalho.getCell(i + 1);
    celula.value = t;
    celula.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_CABECALHO } };
    celula.alignment = { vertical: "middle", horizontal: i < fixas.length ? "left" : "center", wrapText: true };
  });
  cabecalho.height = 30;

  for (const valores of linhas) aba.addRow(valores);
  if (linhaTotal) aba.addRow(linhaTotal).font = { bold: true };

  // Largura e formato de cada coluna
  fixas.forEach((_, i) => (aba.getColumn(i + 1).width = i === 0 ? 30 : 14));
  colunas.forEach((c, i) => {
    const coluna = aba.getColumn(fixas.length + i + 1);
    coluna.width = 14;
    if (c.porcentagem) coluna.numFmt = "0.0%";
  });
  return aba;
}

/** Valores de uma Contagem na ordem de COLUNAS_CONTAGEM. */
function valores(c: Contagem): (number | null)[] {
  return COLUNAS_CONTAGEM.map((col) => c[col.campo]);
}

/**
 * Gera o arquivo .xlsx do relatório.
 * @param descricaoFiltro texto que vai no título (ex.: "Unidade STI")
 * @returns o conteúdo do arquivo, pronto para enviar na resposta HTTP
 */
export async function gerarExcelProducao(relatorio: Relatorio, descricaoFiltro: string): Promise<Buffer> {
  const livro = new ExcelJS.Workbook();
  livro.creator = "Gestão Pós-Venda — Maranhão Motos";
  livro.created = new Date();

  const periodo = mesPorExtenso(relatorio.mes);
  const sufixo = descricaoFiltro ? ` — ${descricaoFiltro}` : "";
  const totalGeral = valores(relatorio.total);

  criarAba(
    livro,
    "Produção",
    `Produção da equipe de pós-venda — ${periodo}${sufixo}`,
    ["Operadora", "Unidade"],
    COLUNAS_CONTAGEM,
    relatorio.linhas.map((l) => [l.operadora.nome, l.unidade.sigla, ...valores(l)]),
    ["Total geral", "", ...totalGeral],
  );

  criarAba(
    livro,
    "Por unidade",
    `Por unidade — ${periodo}${sufixo}`,
    ["Unidade"],
    COLUNAS_CONTAGEM,
    relatorio.porUnidade.map((u) => [`${u.unidade.sigla} — ${u.unidade.nome}`, ...valores(u)]),
    ["Total geral", ...totalGeral],
  );

  criarAba(
    livro,
    "Por operadora",
    `Por operadora — ${periodo}${sufixo}`,
    ["Operadora"],
    COLUNAS_CONTAGEM,
    relatorio.porOperadora.map((o) => [o.operadora.nome, ...valores(o)]),
    ["Total geral", ...totalGeral],
  );

  // Causas: detalhe por operadora × unidade e, ao lado do total, o % de cada linha
  const totalCausas = relatorio.causas.reduce((s, c) => s + c.quantidade, 0);
  const abaCausas = criarAba(
    livro,
    "Causas",
    `Falou e não agendou: causas — ${periodo}${sufixo}`,
    ["Operadora", "Unidade", "Motivo"],
    [{ titulo: "Quantidade" }, { titulo: "% do total", porcentagem: true }],
    relatorio.causas.map((c) => [c.operadora.nome, c.unidade.sigla, c.motivo, c.quantidade, c.quantidade / totalCausas]),
    ["Total geral", "", "", totalCausas, totalCausas ? 1 : null],
  );
  abaCausas.getColumn(3).width = 34;

  // Resumo por motivo, abaixo do detalhe
  abaCausas.addRow([]);
  abaCausas.addRow(["Resumo por motivo"]).font = { bold: true };
  for (const r of relatorio.causasResumo) abaCausas.addRow(["", "", r.motivo, r.quantidade, r.percentual]);

  return Buffer.from(await livro.xlsx.writeBuffer());
}
