/**
 * services/revisoes.ts — Regras de negócio da fila de revisões
 *
 * Camada de SERVIÇO: aqui ficam as consultas e regras. A rota
 * (routes/revisoes.ts) só lê a requisição HTTP e chama estas funções.
 * Vantagem: as regras podem ser testadas sem HTTP e reaproveitadas.
 */

import { prisma } from "../db/prisma.js";

/** Parâmetros de paginação da listagem. */
export type ListarRevisoesParams = {
  /** Página desejada, começando em 1. */
  pagina: number;
  /** Quantidade de itens por página. */
  porPagina: number;
};

/**
 * Lista as revisões da fila, com veículo, cliente, unidade e operadora.
 * Ordem: próximas a contatar primeiro (proximoContato), depois as mais antigas.
 *
 * @returns os itens da página e o total geral (para montar a paginação na tela)
 */
export async function listarRevisoes({ pagina, porPagina }: ListarRevisoesParams) {
  // As duas consultas rodam em paralelo (Promise.all). Não usamos $transaction:
  // com o adapter pg ela dispara consultas simultâneas na mesma conexão,
  // o que o driver marca como obsoleto. Para uma listagem, a pequena chance
  // de o total mudar entre as duas consultas não causa problema.
  const [itens, total] = await Promise.all([
    prisma.revisaoAlvo.findMany({
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      orderBy: [{ proximoContato: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      // select: devolve só os campos necessários (nada de CPF na listagem)
      select: {
        id: true,
        km: true,
        situacao: true,
        dataAgendada: true,
        proximoContato: true,
        concluida: true,
        versao: true,
        veiculo: {
          select: {
            chassi: true,
            modelo: true,
            cor: true,
            dataVenda: true,
            cliente: { select: { id: true, nome: true, celular: true, municipio: true } },
          },
        },
        unidade: { select: { sigla: true, nome: true } },
        operador: { select: { id: true, nome: true } },
      },
    }),
    prisma.revisaoAlvo.count(),
  ]);

  return { itens, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) };
}
