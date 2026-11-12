/**
 * lib/csv.ts — Geração de arquivos CSV que abrem direito no Excel em português
 *
 * Decisões:
 *  - Separador ";" (ponto e vírgula): o Excel em pt-BR usa a vírgula como
 *    separador decimal, então espera ";" entre as colunas.
 *  - BOM UTF-8 no início do arquivo: sem ele, o Excel lê os acentos errado
 *    ("Santa InÃªs" em vez de "Santa Inês").
 *  - Quebra de linha CRLF (\r\n), o padrão do formato CSV (RFC 4180).
 *  - Proteção contra "injeção de fórmula": um texto que começa com = + - @
 *    seria executado como fórmula pelo Excel. Esses valores ganham um
 *    apóstrofo na frente e são exibidos como texto.
 */

/** Uma coluna do CSV: título do cabeçalho e como tirar o valor de cada linha. */
export type ColunaCsv<T> = {
  titulo: string;
  valor: (linha: T) => string | number | null | undefined;
};

/** Byte Order Mark: avisa ao Excel que o arquivo é UTF-8. */
const BOM = "﻿";
const SEPARADOR = ";";

/** Prepara um valor para uma célula do CSV (escapa aspas e neutraliza fórmulas). */
function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);

  // Neutraliza fórmulas (=SOMA(...), +cmd, -2+3, @função)
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;

  // Se tiver separador, aspas ou quebra de linha, envolve em aspas e duplica as aspas internas
  if (/[";\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/**
 * Gera o conteúdo completo de um CSV.
 *
 * @example
 *   gerarCsv([{ titulo: "Nome", valor: (c) => c.nome }], clientes)
 */
export function gerarCsv<T>(colunas: ColunaCsv<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(SEPARADOR);
  const corpo = linhas.map((linha) => colunas.map((c) => celula(c.valor(linha))).join(SEPARADOR));
  return BOM + [cabecalho, ...corpo].join("\r\n") + "\r\n";
}
