/**
 * services/importacao/leitura.ts — Lê os arquivos do Cloud (XLSX ou CSV) (Etapa 6)
 *
 * Transforma o arquivo enviado numa lista de linhas { campo: valor }, com os
 * nomes de campo do sistema (nome, cpf, chassi...), não os títulos do Cloud.
 *
 * Tolerante ao que costuma aparecer em relatórios exportados:
 *  - XLSX ou CSV (separador ";" do Excel brasileiro ou ",");
 *  - CSV em UTF-8 (com ou sem BOM) ou em Latin-1 (Windows);
 *  - linhas de título acima do cabeçalho: procura o cabeçalho nas 15 primeiras linhas;
 *  - títulos com acento, maiúsculas e pontuação diferentes ("Tipo O.S.", "tipo os").
 *
 * Não valida nem normaliza os valores: isso é com normalizar.ts.
 */

import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { ErroHttp } from "../../lib/erros.js";

/** Valor cru de uma célula, como veio do arquivo. */
export type ValorCelula = string | number | Date | boolean | null;

/** Uma linha lida: campo do sistema → valor cru. `numero` = linha no arquivo (para mostrar ao usuário). */
export type LinhaLida<C extends string> = { numero: number; valores: Partial<Record<C, ValorCelula>> };

/** Campos da lista de revisões e os títulos aceitos para cada um (já sem acento, minúsculos, só letras e números). */
export const COLUNAS_REVISOES = {
  nome: ["pessoa", "cliente", "nome", "nomecliente"],
  cpf: ["cpfcnpj", "cpf", "cnpj", "cpfcnpjcliente", "documento"],
  dataVenda: ["datavenda", "dtvenda", "datadavenda"],
  chassi: ["chassi", "chassis"],
  modelo: ["modelo", "descricaomodelo"],
  km: ["km", "kmrevisao", "revisao", "revisaokm"],
  cor: ["cor"],
  celular: ["celular", "telefone", "fone", "telefonecelular"],
  municipio: ["municipio", "cidade"],
} as const;

/** Campos do espelhamento de OS. */
export const COLUNAS_ESPELHAMENTO = {
  chassi: ["chassi", "chassis"],
  tipoOs: ["tipoos", "tipoordemservico", "tipodeos", "tipo"],
  codigoAssistencia: ["codigoassistenciatecnica", "codigoassistencia", "codassistencia", "assistenciatecnica"],
} as const;

/** Campos que precisam existir no cabeçalho para o arquivo ser reconhecido. */
export const OBRIGATORIAS_REVISOES = ["nome", "chassi", "km", "modelo"] as const;
export const OBRIGATORIAS_ESPELHAMENTO = ["chassi", "tipoOs"] as const;

/** Linhas iniciais onde o cabeçalho é procurado (relatórios às vezes têm título em cima). */
const LINHAS_PROCURA_CABECALHO = 15;

/** Máximo de linhas por arquivo (proteção contra arquivos errados ou gigantes). */
export const MAX_LINHAS = 50_000;

/** "Tipo O.S." → "tipoos"; "Município" → "municipio". */
export function chaveDoTitulo(titulo: unknown): string {
  return String(titulo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Valor "útil" de uma célula do exceljs (fórmula → resultado, texto rico → texto, hiperlink → texto). */
function valorDaCelula(v: ExcelJS.CellValue): ValorCelula {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== "object") return v as ValorCelula;
  if ("result" in v) return valorDaCelula(v.result as ExcelJS.CellValue);
  if ("richText" in v) return v.richText.map((t) => t.text).join("");
  if ("text" in v) return String(v.text);
  if ("error" in v) return null;
  return String(v);
}

/** Decodifica o CSV: UTF-8 se for válido, senão Latin-1 (CSV salvo pelo Excel no Windows). */
function textoDoCsv(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("latin1").decode(buffer);
  }
}

/** Lê as células cruas (matriz de linhas) de um XLSX ou CSV. */
async function lerMatriz(buffer: Buffer, nomeArquivo: string): Promise<ValorCelula[][]> {
  const nome = nomeArquivo.toLowerCase();
  if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
    const texto = textoDoCsv(buffer);
    const primeira = texto.split(/\r?\n/, 1)[0] ?? "";
    const delimitador = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
    return parse(texto, { delimiter: delimitador, relax_column_count: true, skip_empty_lines: true, trim: true });
  }
  if (nome.endsWith(".xlsx")) {
    const livro = new ExcelJS.Workbook();
    try {
      await livro.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new ErroHttp(400, `Não foi possível abrir "${nomeArquivo}". Confira se é um arquivo .xlsx válido.`);
    }
    const aba = livro.worksheets[0];
    if (!aba) throw new ErroHttp(400, `"${nomeArquivo}" não tem nenhuma aba.`);
    const matriz: ValorCelula[][] = [];
    aba.eachRow({ includeEmpty: true }, (linha, n) => {
      // row.values começa no índice 1 (coluna A)
      const valores = (linha.values as ExcelJS.CellValue[]).slice(1).map(valorDaCelula);
      matriz[n - 1] = valores;
    });
    return Array.from(matriz, (l) => l ?? []);
  }
  throw new ErroHttp(
    400,
    `"${nomeArquivo}": formato não aceito. Envie .xlsx ou .csv (o .xls antigo precisa ser salvo como .xlsx).`,
  );
}

/**
 * Lê um arquivo e devolve as linhas com os campos do sistema.
 * @param colunas mapa campo → títulos aceitos (COLUNAS_REVISOES ou COLUNAS_ESPELHAMENTO)
 * @param obrigatorias campos sem os quais o arquivo não é reconhecido
 * @throws ErroHttp 400 formato não aceito, cabeçalho não encontrado ou arquivo grande demais
 */
export async function lerPlanilha<C extends string>(
  buffer: Buffer,
  nomeArquivo: string,
  colunas: Record<C, readonly string[]>,
  obrigatorias: readonly C[],
): Promise<LinhaLida<C>[]> {
  const matriz = await lerMatriz(buffer, nomeArquivo);

  // Acha a linha do cabeçalho: a primeira que tem todas as colunas obrigatórias
  let indiceCabecalho = -1;
  let posicao: Partial<Record<C, number>> = {};
  for (let i = 0; i < Math.min(LINHAS_PROCURA_CABECALHO, matriz.length); i++) {
    const titulos = matriz[i].map(chaveDoTitulo);
    const achadas: Partial<Record<C, number>> = {};
    for (const campo of Object.keys(colunas) as C[]) {
      const idx = titulos.findIndex((t) => colunas[campo].includes(t));
      if (idx >= 0) achadas[campo] = idx;
    }
    if (obrigatorias.every((c) => achadas[c] !== undefined)) {
      indiceCabecalho = i;
      posicao = achadas;
      break;
    }
  }
  if (indiceCabecalho < 0) {
    throw new ErroHttp(400, `"${nomeArquivo}": não encontrei o cabeçalho com as colunas ${obrigatorias.join(", ")}.`, {
      codigo: "CABECALHO_NAO_ENCONTRADO",
    });
  }

  const linhas: LinhaLida<C>[] = [];
  for (let i = indiceCabecalho + 1; i < matriz.length; i++) {
    const crua = matriz[i];
    // Pula linhas totalmente vazias (rodapés, espaços)
    if (!crua.some((v) => v !== null && v !== undefined && String(v).trim() !== "")) continue;
    const valores: Partial<Record<C, ValorCelula>> = {};
    for (const campo of Object.keys(posicao) as C[]) valores[campo] = crua[posicao[campo]!] ?? null;
    linhas.push({ numero: i + 1, valores });
    if (linhas.length > MAX_LINHAS) {
      throw new ErroHttp(400, `"${nomeArquivo}" tem mais de ${MAX_LINHAS} linhas. Confira se é o arquivo certo.`);
    }
  }
  return linhas;
}
