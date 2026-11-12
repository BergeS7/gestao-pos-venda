/**
 * services/relatorios.ts — Relatório mensal de produção (Etapa 10)
 *
 * Reproduz a planilha "Produção equipe pós venda oficina - <mês>.xlsx", que
 * hoje é montada à mão (docs/regras-de-negocio.md, seção 5).
 *
 * ---------------------------------------------------------------------------
 * COMO O MÊS É CONTADO (regra documentada em docs/regras-de-negocio.md, 5.1)
 * ---------------------------------------------------------------------------
 * A unidade de contagem é a REVISÃO (uma moto + uma km), não a ligação:
 * ligar 3 vezes para o mesmo cliente conta 1 cliente, como na planilha.
 *
 *  - Total de clientes : revisões com pelo menos uma ligação registrada no mês.
 *  - Conseguiu falar   : dessas, as que tiveram alguma ligação no mês em que
 *                        a operadora conseguiu falar.
 *  - Não conseguiu     : total − conseguiu falar.
 *  - Agendados         : as que tiveram alguma ligação no mês com "Agendou? Sim".
 *  - Concluídos        : das agendadas no mês, as que já foram feitas na
 *                        oficina (mesmo que a conclusão caia no mês seguinte,
 *                        como no bloco "agendados no mês X, concluídos no X+1").
 *  - Operadora         : quem registrou a ÚLTIMA ligação do mês para aquela
 *                        revisão. Assim cada revisão cai numa linha só e as
 *                        somas por operadora batem com o total geral.
 *  - Unidade           : a unidade da revisão.
 *  - Causa (falou e não agendou): o motivo da última ligação do mês em que a
 *                        operadora falou com o cliente. A soma das causas é
 *                        igual a "conseguiu falar − agendados".
 *
 * Mês = do dia 1 às 00:00 até o último dia às 23:59, no horário do Maranhão
 * (UTC−3, sem horário de verão).
 *
 * Funções:
 *  - intervaloDoMes   → início e fim do mês em UTC
 *  - montarRelatorio  → cálculo PURO (sem banco): fácil de conferir à mão
 *  - relatorioProducao→ busca as ligações do mês no banco e chama montarRelatorio
 */

import { prisma } from "../db/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { FiltrosRelatorio } from "../schemas/relatorios.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Os números de uma linha do relatório e as taxas calculadas a partir deles. */
export type Contagem = {
  total: number;
  falou: number;
  naoFalou: number;
  agendados: number;
  concluidos: number;
  /** % sucesso no contato = falou ÷ total. null quando o divisor é zero. */
  taxaContato: number | null;
  /** % sucesso no agendamento = agendados ÷ falou. */
  taxaAgendamento: number | null;
  /** % conclusão sobre agendados = concluídos ÷ agendados. */
  taxaConclusao: number | null;
  /** % concluídos da base = concluídos ÷ total. */
  taxaConcluidosBase: number | null;
};

/** Operadora como aparece no relatório (id null = ligação sem autor registrado). */
export type OperadoraRelatorio = { id: number | null; nome: string };

/** Unidade como aparece no relatório (sigla "—" = revisão sem unidade). */
export type UnidadeRelatorio = { sigla: string; nome: string };

/** Uma causa de "falou e não agendou" numa combinação operadora × unidade. */
export type Causa = {
  operadora: OperadoraRelatorio;
  unidade: UnidadeRelatorio;
  motivo: string;
  quantidade: number;
};

/** Relatório completo de um mês. */
export type Relatorio = {
  /** Mês do relatório (AAAA-MM). */
  mes: string;
  /** Tabela operadora × unidade (a planilha original). */
  linhas: (Contagem & { operadora: OperadoraRelatorio; unidade: UnidadeRelatorio })[];
  /** Totais por unidade (inclui % concluídos da base por unidade). */
  porUnidade: (Contagem & { unidade: UnidadeRelatorio })[];
  /** Totais por operadora (rankings). */
  porOperadora: (Contagem & { operadora: OperadoraRelatorio })[];
  /** Total geral. */
  total: Contagem;
  /** Causas por operadora × unidade × motivo. */
  causas: Causa[];
  /** Causas somadas de todo o filtro, com o % sobre o total de causas. */
  causasResumo: { motivo: string; quantidade: number; percentual: number }[];
};

/**
 * Uma ligação, só com os campos que o relatório usa. É o formato que
 * relatorioProducao busca no banco; os testes podem montar à mão.
 */
export type LigacaoRelatorio = {
  revisaoId: number;
  criadoEm: Date;
  conseguiuFalar: boolean;
  resultado: "SIM" | "NAO" | "RETORNAR";
  motivo: string | null;
  usuario: { id: number; nome: string } | null;
  revisao: { concluida: boolean; unidade: UnidadeRelatorio | null };
};

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

/** Diferença do horário do Maranhão para o UTC (America/Fortaleza não tem horário de verão). */
const FUSO_HORAS = 3;

/**
 * Início (inclusive) e fim (exclusive) do mês, em UTC.
 * @example intervaloDoMes("2026-10") → 2026-10-01T03:00Z até 2026-11-01T03:00Z
 */
export function intervaloDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, m] = mes.split("-").map(Number);
  return {
    inicio: new Date(Date.UTC(ano, m - 1, 1, FUSO_HORAS)),
    fim: new Date(Date.UTC(ano, m, 1, FUSO_HORAS)), // Date.UTC passa de dezembro para janeiro sozinho
  };
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/** Divide sem quebrar quando o divisor é zero (a tela mostra "—"). */
function taxa(parte: number, todo: number): number | null {
  return todo === 0 ? null : parte / todo;
}

/** Contagem vazia, para ir somando. */
function zerada() {
  return { total: 0, falou: 0, agendados: 0, concluidos: 0 };
}

/** Acrescenta o "não falou" e as quatro taxas aos números brutos. */
function comTaxas(c: ReturnType<typeof zerada>): Contagem {
  return {
    ...c,
    naoFalou: c.total - c.falou,
    taxaContato: taxa(c.falou, c.total),
    taxaAgendamento: taxa(c.agendados, c.falou),
    taxaConclusao: taxa(c.concluidos, c.agendados),
    taxaConcluidosBase: taxa(c.concluidos, c.total),
  };
}

/** Revisão sem unidade cadastrada. */
const SEM_UNIDADE: UnidadeRelatorio = { sigla: "—", nome: "Sem unidade" };
/** Ligação sem autor (registros antigos, antes do login). */
const SEM_OPERADORA: OperadoraRelatorio = { id: null, nome: "Sem registro" };
/** "Falou e não agendou" sem motivo escolhido. */
const SEM_MOTIVO = "Sem motivo informado";

/** Lê `chave` do Map; se não existir, cria com `criar()` e guarda. */
function pegar<V>(mapa: Map<string, V>, chave: string, criar: () => V): V {
  let valor = mapa.get(chave);
  if (valor === undefined) {
    valor = criar();
    mapa.set(chave, valor);
  }
  return valor;
}

/**
 * Monta o relatório a partir das ligações do mês. Função PURA: não lê o
 * banco, então dá para conferir o resultado com uma lista feita à mão.
 *
 * @param ligacoes  todas as ligações do mês (já filtradas por unidade, se houver)
 * @param operador  se informado, só entram as revisões atribuídas a esta operadora
 */
export function montarRelatorio(mes: string, ligacoes: LigacaoRelatorio[], operador?: number): Relatorio {
  // 1) Agrupa as ligações por revisão, da mais antiga para a mais nova
  const porRevisao = new Map<number, LigacaoRelatorio[]>();
  for (const l of [...ligacoes].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())) {
    const lista = porRevisao.get(l.revisaoId) ?? [];
    lista.push(l);
    porRevisao.set(l.revisaoId, lista);
  }

  // Acumuladores: chave → contagem
  const linhas = new Map<string, { operadora: OperadoraRelatorio; unidade: UnidadeRelatorio; c: ReturnType<typeof zerada> }>();
  const unidades = new Map<string, { unidade: UnidadeRelatorio; c: ReturnType<typeof zerada> }>();
  const operadoras = new Map<string, { operadora: OperadoraRelatorio; c: ReturnType<typeof zerada> }>();
  const total = zerada();
  const causas = new Map<string, Causa>();

  // 2) Resume cada revisão e soma nas linhas
  for (const lista of porRevisao.values()) {
    const ultima = lista[lista.length - 1];
    const operadora = ultima.usuario ?? SEM_OPERADORA;
    if (operador !== undefined && operadora.id !== operador) continue;

    const unidade = ultima.revisao.unidade ?? SEM_UNIDADE;
    const falou = lista.some((l) => l.conseguiuFalar);
    const agendou = lista.some((l) => l.resultado === "SIM");
    const concluiu = agendou && ultima.revisao.concluida;

    const chaveOp = String(operadora.id);
    const chaveLinha = `${chaveOp}|${unidade.sigla}`;
    // A mesma revisão soma no total, na sua linha, na sua unidade e na sua operadora
    const alvos = [
      total,
      pegar(linhas, chaveLinha, () => ({ operadora, unidade, c: zerada() })).c,
      pegar(unidades, unidade.sigla, () => ({ unidade, c: zerada() })).c,
      pegar(operadoras, chaveOp, () => ({ operadora, c: zerada() })).c,
    ];
    for (const c of alvos) {
      c.total += 1;
      if (falou) c.falou += 1;
      if (agendou) c.agendados += 1;
      if (concluiu) c.concluidos += 1;
    }

    // Causa: falou e não agendou → motivo da última ligação em que falou
    if (falou && !agendou) {
      const ultimaFalada = lista.filter((l) => l.conseguiuFalar).at(-1)!;
      const motivo = ultimaFalada.motivo ?? SEM_MOTIVO;
      const chaveCausa = `${chaveLinha}|${motivo}`;
      pegar(causas, chaveCausa, () => ({ operadora, unidade, motivo, quantidade: 0 })).quantidade += 1;
    }
  }

  // 3) Resumo das causas (todas as operadoras e unidades do filtro)
  const somaCausas = new Map<string, number>();
  for (const c of causas.values()) somaCausas.set(c.motivo, (somaCausas.get(c.motivo) ?? 0) + c.quantidade);
  const totalCausas = [...somaCausas.values()].reduce((a, b) => a + b, 0);

  /** Ordem alfabética em português (acentos certos). */
  const porNome = (a: string, b: string) => a.localeCompare(b, "pt-BR");

  return {
    mes,
    linhas: [...linhas.values()]
      .map((l) => ({ operadora: l.operadora, unidade: l.unidade, ...comTaxas(l.c) }))
      .sort((a, b) => porNome(a.operadora.nome, b.operadora.nome) || porNome(a.unidade.sigla, b.unidade.sigla)),
    porUnidade: [...unidades.values()]
      .map((u) => ({ unidade: u.unidade, ...comTaxas(u.c) }))
      .sort((a, b) => porNome(a.unidade.sigla, b.unidade.sigla)),
    porOperadora: [...operadoras.values()]
      .map((o) => ({ operadora: o.operadora, ...comTaxas(o.c) }))
      .sort((a, b) => porNome(a.operadora.nome, b.operadora.nome)),
    total: comTaxas(total),
    causas: [...causas.values()].sort(
      (a, b) =>
        porNome(a.operadora.nome, b.operadora.nome) || porNome(a.unidade.sigla, b.unidade.sigla) || b.quantidade - a.quantidade,
    ),
    causasResumo: [...somaCausas.entries()]
      .map(([motivo, quantidade]) => ({ motivo, quantidade, percentual: quantidade / totalCausas }))
      .sort((a, b) => b.quantidade - a.quantidade || porNome(a.motivo, b.motivo)),
  };
}

// ---------------------------------------------------------------------------
// Banco
// ---------------------------------------------------------------------------

/**
 * Busca as ligações do mês (com o filtro de unidade) e monta o relatório.
 * O filtro de operadora é aplicado no cálculo, porque depende de quem fez a
 * última ligação de cada revisão.
 */
export async function relatorioProducao(filtros: FiltrosRelatorio): Promise<Relatorio> {
  const { inicio, fim } = intervaloDoMes(filtros.mes);

  const where: Prisma.TentativaContatoWhereInput = {
    criadoEm: { gte: inicio, lt: fim },
    ...(filtros.unidade && { revisao: { unidade: { sigla: filtros.unidade } } }),
  };

  const registros = await prisma.tentativaContato.findMany({
    where,
    select: {
      revisaoId: true,
      criadoEm: true,
      conseguiuFalar: true,
      resultado: true,
      motivo: { select: { descricao: true } },
      usuario: { select: { id: true, nome: true } },
      revisao: { select: { concluida: true, unidade: { select: { sigla: true, nome: true } } } },
    },
  });

  return montarRelatorio(
    filtros.mes,
    registros.map((r) => ({ ...r, motivo: r.motivo?.descricao ?? null })),
    filtros.operador,
  );
}
