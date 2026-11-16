/**
 * services/agenda.ts — Agenda do dia da operadora
 *
 * Responde "o que eu preciso fazer hoje?", juntando a fila em seções:
 *
 * | Seção              | Quais revisões                                               | Ordem                   |
 * |--------------------|--------------------------------------------------------------|-------------------------|
 * | ligarHoje          | RETORNAR com próximo contato até hoje (inclui atrasados)     | mais atrasado primeiro  |
 * | agendadosHoje      | AGENDADO para hoje: o cliente deve vir à oficina hoje         | por nome do cliente     |
 * | agendadosPassados  | AGENDADO para um dia que já passou e ainda não concluído:    | mais antigo primeiro    |
 * |                    | confirmar se veio (concluir) ou ligar para remarcar          |                         |
 * | buscarContato      | BUSCAR_CONTATO: o telefone não funciona, procurar outro      | data marcada, depois id |
 * | semContato         | PENDENTE: ainda ninguém ligou                                | ordem de entrada        |
 *
 * E um número: `proximosDias`, quantos retornos estão marcados para os
 * próximos 7 dias (para a operadora se planejar).
 *
 * Cada seção traz até LIMITE_POR_SECAO revisões e o total real; quando
 * passar do limite, a tela oferece "ver todas na fila".
 *
 * "Hoje" é o dia no horário do Maranhão (lib/datas.ts). As datas da agenda
 * são só dia (DATE), então a comparação é feita com meia-noite UTC.
 */

import { prisma } from "../db/prisma.js";
import { Prisma, SituacaoRevisao } from "../generated/prisma/client.js";
import { hoje, paraDia, somarDias } from "../lib/datas.js";
import type { FiltrosAgenda } from "../schemas/revisoes.js";
import { camposRevisao } from "./revisoes.js";

/** Máximo de revisões listadas por seção (o total vem sempre completo). */
export const LIMITE_POR_SECAO = 50;

/** Dias à frente contados em `proximosDias`. */
export const DIAS_A_FRENTE = 7;

/** Nome de cada seção da agenda. */
export type ChaveSecao = "ligarHoje" | "agendadosHoje" | "agendadosPassados" | "buscarContato" | "semContato";

/**
 * Monta a agenda do dia.
 * @param filtros unidade e operadora (para a operadora, a rota força o id dela)
 * @param dia     o "hoje" da agenda (AAAA-MM-DD); trocar só em testes
 */
export async function agendaDoDia(filtros: FiltrosAgenda, dia: string = hoje()) {
  const hojeData = paraDia(dia)!;
  const amanha = paraDia(somarDias(dia, 1))!;
  const limiteFuturo = paraDia(somarDias(dia, DIAS_A_FRENTE + 1))!;

  // Filtro comum a todas as seções: unidade e operadora
  const base: Prisma.RevisaoAlvoWhereInput = {};
  if (filtros.unidade) base.unidade = { sigla: filtros.unidade };
  if (filtros.operador === "sem") base.operadorId = null;
  else if (filtros.operador !== undefined) base.operadorId = filtros.operador;

  const secoes: Record<
    ChaveSecao,
    { where: Prisma.RevisaoAlvoWhereInput; orderBy: Prisma.RevisaoAlvoOrderByWithRelationInput[] }
  > = {
    ligarHoje: {
      where: { situacao: SituacaoRevisao.RETORNAR, proximoContato: { lt: amanha } },
      orderBy: [{ proximoContato: "asc" }, { id: "asc" }],
    },
    agendadosHoje: {
      where: { situacao: SituacaoRevisao.AGENDADO, concluida: false, dataAgendada: { gte: hojeData, lt: amanha } },
      orderBy: [{ veiculo: { cliente: { nome: "asc" } } }],
    },
    agendadosPassados: {
      where: { situacao: SituacaoRevisao.AGENDADO, concluida: false, dataAgendada: { lt: hojeData } },
      orderBy: [{ dataAgendada: "asc" }, { id: "asc" }],
    },
    buscarContato: {
      where: { situacao: SituacaoRevisao.BUSCAR_CONTATO },
      orderBy: [{ proximoContato: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    },
    semContato: {
      where: { situacao: SituacaoRevisao.PENDENTE },
      orderBy: [{ id: "asc" }],
    },
  };

  // Todas as consultas em paralelo: uma lista e um total por seção, mais os próximos dias
  const chaves = Object.keys(secoes) as ChaveSecao[];
  const [resultados, proximosDias] = await Promise.all([
    Promise.all(
      chaves.map(async (chave) => {
        const where = { ...base, ...secoes[chave].where };
        const [itens, total] = await Promise.all([
          prisma.revisaoAlvo.findMany({
            where,
            orderBy: secoes[chave].orderBy,
            take: LIMITE_POR_SECAO,
            select: camposRevisao,
          }),
          prisma.revisaoAlvo.count({ where }),
        ]);
        return [chave, { total, itens }] as const;
      }),
    ),
    prisma.revisaoAlvo.count({
      where: { ...base, situacao: SituacaoRevisao.RETORNAR, proximoContato: { gte: amanha, lt: limiteFuturo } },
    }),
  ]);

  return {
    /** O dia da agenda (AAAA-MM-DD). */
    hoje: dia,
    secoes: Object.fromEntries(resultados) as Record<
      ChaveSecao,
      { total: number; itens: (typeof resultados)[number][1]["itens"] }
    >,
    /** Retornos marcados de amanhã até DIAS_A_FRENTE dias. */
    proximosDias,
    limitePorSecao: LIMITE_POR_SECAO,
  };
}
