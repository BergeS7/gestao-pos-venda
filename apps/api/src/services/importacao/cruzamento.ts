/**
 * services/importacao/cruzamento.ts — A regra de cruzamento por chassi (Etapa 6)
 *
 * O coração da importação: decide quem da lista de revisões entra na fila de
 * ligações. Hoje a equipe faz isso no Excel (docs/regras-de-negocio.md, seção 3):
 * quem tem ordem de serviço (OS) no espelhamento já fez a revisão e sai da lista.
 *
 * Cada linha válida da lista cai em UMA categoria, nesta ordem:
 *  1. duplicada       → mesmo chassi + km apareceu antes no MESMO arquivo;
 *  2. jaNaFila        → essa revisão (chassi + km) já está no sistema;
 *  3. anonimizado     → a moto é de um cliente anonimizado a pedido (LGPD): não volta;
 *  4. comOs           → o chassi tem OS (ver "modo" abaixo): já fez a revisão;
 *  5. elegivel        → entra na fila.
 *
 * MODO DO CRUZAMENTO (pergunta em aberto para a equipe):
 *  - exigirTipoOs = false (padrão, igual à planilha): QUALQUER OS do chassi no
 *    espelhamento enviado tira a linha;
 *  - exigirTipoOs = true: só tira se o tipo da OS corresponde ao km
 *    ("1ª REVISÃO" → 1000, "2ª REVISÃO" → 6000, "REVISÃO PERIÓDICA" → 12000/18000).
 * OS de importações ANTERIORES (já no banco) só contam se o tipo corresponder ao
 * km, nos dois modos: senão a 1ª revisão feita há um ano tiraria o cliente da
 * lista de 6000 km para sempre.
 *
 * CONCLUSÃO AUTOMÁTICA: revisões abertas no sistema cujo chassi aparece no
 * espelhamento com OS do mesmo km são marcadas como concluídas (substitui o
 * "Status = Concluída" digitado à mão).
 *
 * Funções puras (sem banco). Teste com os arquivos fictícios de db/seed/: cruzamento.test.ts.
 */

import type { OsImportada, RevisaoImportada } from "./normalizar.js";

/**
 * Revisões (km) que um tipo de OS indica. null = tipo desconhecido (ex.: "EXTERNO - PACOTE").
 * Tabela de docs/regras-de-negocio.md, seção 2.2.
 */
export function kmsDoTipoOs(tipoOs: string): number[] | null {
  const t = tipoOs
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (/\b1\s*[ªAºO°]?\s*REVIS/.test(t)) return [1000];
  if (/\b2\s*[ªAºO°]?\s*REVIS/.test(t)) return [6000];
  if (/PERIODICA/.test(t)) return [12000, 18000];
  return null;
}

/** true se a OS corresponde à revisão de `km`. */
export function osCorrespondeAoKm(tipoOs: string, km: number): boolean {
  return kmsDoTipoOs(tipoOs)?.includes(km) ?? false;
}

/**
 * Unidade (STI, ZDC, BRT) pelo município do cliente.
 * ⚠️ PROVISÓRIO: a equipe ainda vai dizer como a unidade é definida
 * (docs/regras-de-negocio.md, seção 7). Município fora da lista fica sem
 * unidade e aparece como aviso na prévia; o Gestor ajusta depois.
 */
export const UNIDADE_POR_MUNICIPIO: Record<string, string> = {
  // Chaves sem acento e em maiúsculas (a busca tira os acentos do município)
  "SANTA INES": "STI",
  "PIO XII": "STI",
  "ZE DOCA": "ZDC",
  BURITICUPU: "BRT",
};

/** Sigla da unidade para o município (com ou sem acento), ou null se não estiver na tabela. */
export function unidadeDoMunicipio(municipio: string | null): string | null {
  if (!municipio) return null;
  const chave = municipio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return UNIDADE_POR_MUNICIPIO[chave] ?? null;
}

/** OS já conhecida (do arquivo enviado ou do banco). */
export type OsConhecida = { chassi: string; tipoOs: string; origem: "arquivo" | "banco" };

/** O que o banco já sabe, buscado antes de classificar. */
export type ContextoCruzamento = {
  /** "CHASSI|KM" das revisões que já estão no sistema. */
  jaNaFila: Set<string>;
  /** Chassis de motos de clientes anonimizados. */
  chassisAnonimizados: Set<string>;
  /** OS por chassi: do espelhamento enviado e das importações anteriores. */
  osPorChassi: Map<string, OsConhecida[]>;
  exigirTipoOs: boolean;
};

/** Linha removida por ter OS, com o tipo da OS que a removeu. */
export type RevisaoComOs = RevisaoImportada & { tipoOs: string };

/** Resultado da classificação. */
export type Classificacao = {
  duplicadas: RevisaoImportada[];
  jaNaFila: RevisaoImportada[];
  anonimizados: RevisaoImportada[];
  comOs: RevisaoComOs[];
  elegiveis: RevisaoImportada[];
};

/** Chave de uma revisão: chassi + km. */
export const chaveRevisao = (chassi: string, km: number) => `${chassi}|${km}`;

/** Agrupa OS por chassi. */
export function agruparOs(lista: OsConhecida[]): Map<string, OsConhecida[]> {
  const mapa = new Map<string, OsConhecida[]>();
  for (const os of lista) mapa.set(os.chassi, [...(mapa.get(os.chassi) ?? []), os]);
  return mapa;
}

/**
 * A OS que tira esta revisão da lista, ou undefined se nenhuma tira.
 * Regras do modo no cabeçalho do arquivo.
 */
export function osQueRemove(revisao: { chassi: string; km: number }, ctx: ContextoCruzamento): OsConhecida | undefined {
  return (ctx.osPorChassi.get(revisao.chassi) ?? []).find((os) =>
    os.origem === "arquivo" && !ctx.exigirTipoOs ? true : osCorrespondeAoKm(os.tipoOs, revisao.km),
  );
}

/** Classifica as linhas válidas da lista de revisões (ordem das categorias no cabeçalho). */
export function classificarRevisoes(validas: RevisaoImportada[], ctx: ContextoCruzamento): Classificacao {
  const r: Classificacao = { duplicadas: [], jaNaFila: [], anonimizados: [], comOs: [], elegiveis: [] };
  const vistas = new Set<string>();
  for (const linha of validas) {
    const chave = chaveRevisao(linha.chassi, linha.km);
    if (vistas.has(chave)) {
      r.duplicadas.push(linha);
      continue;
    }
    vistas.add(chave);
    if (ctx.jaNaFila.has(chave)) r.jaNaFila.push(linha);
    else if (ctx.chassisAnonimizados.has(linha.chassi)) r.anonimizados.push(linha);
    else {
      const os = osQueRemove(linha, ctx);
      if (os) r.comOs.push({ ...linha, tipoOs: os.tipoOs });
      else r.elegiveis.push(linha);
    }
  }
  return r;
}

/** Revisão aberta no sistema (candidata à conclusão automática). */
export type RevisaoAberta = { id: number; chassi: string; km: number };

/**
 * Revisões abertas que o espelhamento enviado mostra como feitas: o chassi tem
 * OS cujo tipo corresponde ao km. Tipo desconhecido não conclui nada.
 * @returns ids a concluir, com o tipo de OS que comprovou
 */
export function conclusoesAutomaticas(
  abertas: RevisaoAberta[],
  osDoArquivo: OsImportada[],
): { id: number; chassi: string; km: number; tipoOs: string }[] {
  const porChassi = new Map<string, OsImportada[]>();
  for (const os of osDoArquivo) porChassi.set(os.chassi, [...(porChassi.get(os.chassi) ?? []), os]);
  const resultado: { id: number; chassi: string; km: number; tipoOs: string }[] = [];
  for (const r of abertas) {
    const os = (porChassi.get(r.chassi) ?? []).find((o) => osCorrespondeAoKm(o.tipoOs, r.km));
    if (os) resultado.push({ ...r, tipoOs: os.tipoOs });
  }
  return resultado;
}
