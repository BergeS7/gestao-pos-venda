/**
 * services/importacao/normalizar.ts — Limpa e valida cada linha importada (Etapa 6)
 *
 * Os relatórios do Cloud vêm com variações (docs/regras-de-negocio.md, seção 2):
 * chassi com espaço, município com ou sem "/MA", CPF com pontos, celular com
 * parênteses, data como texto ou como data do Excel. Aqui tudo vira um formato
 * único, e cada linha sai como VÁLIDA (pronta para gravar) ou INVÁLIDA (com os
 * motivos, para mostrar na prévia).
 *
 * Funções puras (sem banco), testadas em normalizar.test.ts.
 */

import { KMS_REVISAO } from "../../schemas/revisoes.js";
import type { LinhaLida, ValorCelula } from "./leitura.js";
import type { COLUNAS_ESPELHAMENTO, COLUNAS_REVISOES } from "./leitura.js";

/** Linha da lista de revisões já normalizada. Datas em ISO (texto), para caber no JSON da prévia. */
export type RevisaoImportada = {
  numero: number;
  nome: string;
  cpf: string | null;
  /** Data da venda, "AAAA-MM-DD", ou null se não veio/for inválida. */
  dataVenda: string | null;
  chassi: string;
  modelo: string;
  km: number;
  cor: string | null;
  celular: string | null;
  municipio: string | null;
  /** Problemas que não impedem a importação (ex.: celular inválido fica vazio). */
  avisos: string[];
};

/** Ordem de serviço do espelhamento, normalizada. */
export type OsImportada = { numero: number; chassi: string; tipoOs: string; codigoAssistencia: string | null };

/** Linha recusada, com os motivos. */
export type LinhaInvalida = { numero: number; motivos: string[]; chassi: string | null; nome: string | null };

/** Resultado de normalizar um arquivo. */
export type Normalizado<T> = { validas: T[]; invalidas: LinhaInvalida[] };

/**
 * Chassi (VIN): 17 caracteres, letras e números, sem I, O e Q (que se confundem com 1 e 0).
 * Ex.: "9C2KC2200TR000001".
 */
const CHASSI_VALIDO = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Texto limpo: sem espaços nas pontas e espaços repetidos; null se vazio. */
export function texto(v: ValorCelula | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = (v instanceof Date ? v.toISOString() : String(v)).replace(/\s+/g, " ").trim();
  return t === "" ? null : t;
}

/** Chassi sem espaços, pontos ou traços, em maiúsculas. "9c2 kc22-00tr000001" → "9C2KC2200TR000001". */
export function normalizarChassi(v: ValorCelula | undefined): string | null {
  const t = texto(v);
  return t ? t.replace(/[\s.-]/g, "").toUpperCase() : null;
}

/** true se o chassi tem o formato de um VIN. */
export function chassiValido(chassi: string): boolean {
  return CHASSI_VALIDO.test(chassi);
}

/** Só os dígitos. */
function digitos(v: ValorCelula | undefined): string {
  return (texto(v) ?? "").replace(/\D/g, "");
}

/** CPF (11 dígitos) ou CNPJ (14). "000.000.000-01" → "00000000001". Null se não tiver um desses tamanhos. */
export function normalizarCpf(v: ValorCelula | undefined): string | null {
  let d = digitos(v);
  // Número vindo como valor numérico do Excel perde os zeros à esquerda
  if (typeof v === "number" && d.length < 11) d = d.padStart(11, "0");
  return d.length === 11 || d.length === 14 ? d : null;
}

/**
 * Celular só com DDD + número (10 ou 11 dígitos). Tira o 55 do Brasil e o 0 de
 * operadora. "(98) 900000001" → "98900000001". Null se não reconhecer.
 */
export function normalizarCelular(v: ValorCelula | undefined): string | null {
  let d = digitos(v);
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  // "0" na frente do DDD (discagem interurbana): 098... → 98...
  if ((d.length === 11 || d.length === 12) && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 || d.length === 11 ? d : null;
}

/** Município em maiúsculas, sem o "/MA" ou "- MA" do fim. "Santa Inês/MA" → "SANTA INÊS". */
export function normalizarMunicipio(v: ValorCelula | undefined): string | null {
  const t = texto(v);
  if (!t) return null;
  return t
    .toUpperCase()
    .replace(/\s*[/-]\s*MA$/, "")
    .trim();
}

/** Km da revisão: aceita "1000", "1.000", "1000 KM", 1000. Null se não houver número. */
export function normalizarKm(v: ValorCelula | undefined): number | null {
  const d = digitos(v);
  return d ? Number(d) : null;
}

/**
 * Data da venda em "AAAA-MM-DD". Aceita:
 *  - data do Excel (Date ou número de série, ex.: 46232);
 *  - "2026-07-29 12:02:58", "2026-07-29";
 *  - "29/07/2026", "29/07/2026 12:02".
 * Null se não reconhecer ou se o dia não existir (ex.: 31/02).
 */
export function normalizarData(v: ValorCelula | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  let ano: number, mes: number, dia: number;
  if (v instanceof Date) {
    // O exceljs entrega a data como UTC "de parede": usar os campos UTC
    [ano, mes, dia] = [v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()];
  } else if (typeof v === "number") {
    // Número de série do Excel: dias desde 30/12/1899
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86_400_000);
    [ano, mes, dia] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  } else {
    const t = String(v).trim();
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (iso) [ano, mes, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    else if (br) [ano, mes, dia] = [Number(br[3]), Number(br[2]), Number(br[1])];
    else return null;
  }
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  if (ano < 2000 || ano > 2100) return null;
  return data.toISOString().slice(0, 10);
}

/** Normaliza e valida as linhas da lista de revisões. */
export function normalizarRevisoes(linhas: LinhaLida<keyof typeof COLUNAS_REVISOES>[]): Normalizado<RevisaoImportada> {
  const validas: RevisaoImportada[] = [];
  const invalidas: LinhaInvalida[] = [];

  for (const { numero, valores: v } of linhas) {
    const motivos: string[] = [];
    const avisos: string[] = [];

    const nome = texto(v.nome)?.toUpperCase() ?? null;
    const chassi = normalizarChassi(v.chassi);
    const modelo = texto(v.modelo)?.toUpperCase() ?? null;
    const km = normalizarKm(v.km);

    if (!nome) motivos.push("Sem nome do cliente");
    if (!chassi) motivos.push("Sem chassi");
    else if (!chassiValido(chassi)) motivos.push(`Chassi inválido (${chassi.length} caracteres; precisa de 17)`);
    if (!modelo) motivos.push("Sem modelo");
    if (km === null) motivos.push("Sem km da revisão");
    else if (!(KMS_REVISAO as readonly number[]).includes(km)) {
      motivos.push(`Km ${km} não é uma revisão (${KMS_REVISAO.join(", ")})`);
    }

    if (motivos.length > 0) {
      invalidas.push({ numero, motivos, chassi, nome });
      continue;
    }

    const cpf = normalizarCpf(v.cpf);
    if (texto(v.cpf) && !cpf) avisos.push("CPF/CNPJ com tamanho errado: ficou vazio");
    const celular = normalizarCelular(v.celular);
    if (texto(v.celular) && !celular) avisos.push("Celular não reconhecido: ficou vazio");
    if (!celular && !texto(v.celular)) avisos.push("Sem celular");
    const dataVenda = normalizarData(v.dataVenda);
    if (texto(v.dataVenda) && !dataVenda) avisos.push("Data da venda inválida: ficou vazia");

    validas.push({
      numero,
      nome: nome!,
      cpf,
      dataVenda,
      chassi: chassi!,
      modelo: modelo!,
      km: km!,
      cor: texto(v.cor)?.toUpperCase() ?? null,
      celular,
      municipio: normalizarMunicipio(v.municipio),
      avisos,
    });
  }
  return { validas, invalidas };
}

/** Normaliza e valida as linhas do espelhamento de OS. */
export function normalizarEspelhamento(
  linhas: LinhaLida<keyof typeof COLUNAS_ESPELHAMENTO>[],
): Normalizado<OsImportada> {
  const validas: OsImportada[] = [];
  const invalidas: LinhaInvalida[] = [];
  for (const { numero, valores: v } of linhas) {
    const chassi = normalizarChassi(v.chassi);
    const tipoOs = texto(v.tipoOs)?.toUpperCase() ?? null;
    const motivos: string[] = [];
    if (!chassi) motivos.push("Sem chassi");
    else if (!chassiValido(chassi)) motivos.push(`Chassi inválido (${chassi.length} caracteres; precisa de 17)`);
    if (!tipoOs) motivos.push("Sem tipo de OS");
    if (motivos.length > 0) {
      invalidas.push({ numero, motivos, chassi, nome: null });
      continue;
    }
    validas.push({ numero, chassi: chassi!, tipoOs: tipoOs!, codigoAssistencia: texto(v.codigoAssistencia) });
  }
  return { validas, invalidas };
}
