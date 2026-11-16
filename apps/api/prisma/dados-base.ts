/**
 * prisma/dados-base.ts — Dados de apoio do negócio (Etapa 11)
 *
 * São dados REAIS, mas não pessoais: as 3 unidades e os 11 motivos de não
 * agendamento da planilha. Entram em TODOS os bancos:
 *  - no de desenvolvimento, pelo seed (prisma/seed.ts);
 *  - no de produção, pelo script de implantação (prisma/producao.ts).
 *
 * Ficavam dentro do seed até a Etapa 10; foram separados para que a produção
 * receba estes dados sem receber os clientes e usuários fictícios do seed.
 */

import type { PrismaClient } from "../src/generated/prisma/client.js";
import { AcaoMotivo } from "../src/generated/prisma/client.js";

/** Unidades da concessionária, conforme o relatório de produção. */
export const UNIDADES = [
  { sigla: "STI", nome: "Santa Inês" },
  { sigla: "ZDC", nome: "Zé Doca" },
  { sigla: "BRT", nome: "Buriticupu" },
];

/**
 * Motivos de não agendamento (docs/regras-de-negocio.md, seção 4).
 * `acao` diz para onde a revisão vai quando a ligação termina com o motivo:
 *   RETORNAR       → volta para a fila com nova data de contato;
 *   BUSCAR_CONTATO → o telefone não funciona, procurar outro;
 *   ENCERRAR       → o cliente sai da fila nesta revisão.
 * Pendente de confirmação com a equipe: "Sem condição financeira" e "Em abstenção".
 */
export const MOTIVOS = [
  { descricao: "Retornar depois", acao: AcaoMotivo.RETORNAR },
  { descricao: "Km não atingida", acao: AcaoMotivo.RETORNAR },
  { descricao: "Contato não funciona (buscar)", acao: AcaoMotivo.BUSCAR_CONTATO },
  { descricao: "Mecânico de confiança", acao: AcaoMotivo.ENCERRAR },
  { descricao: "Em abstenção", acao: AcaoMotivo.ENCERRAR },
  { descricao: "Se desfez da moto", acao: AcaoMotivo.ENCERRAR },
  { descricao: "Moto revenda (em nome de terceiros)", acao: AcaoMotivo.ENCERRAR },
  { descricao: "Sem condição financeira", acao: AcaoMotivo.ENCERRAR },
  { descricao: "Muito distante", acao: AcaoMotivo.ENCERRAR },
  { descricao: "Realiza em outra autorizada", acao: AcaoMotivo.ENCERRAR },
  { descricao: "Acha caro e serviço simples", acao: AcaoMotivo.ENCERRAR },
];

/**
 * Grava (ou atualiza) unidades e motivos. Pode rodar várias vezes sem duplicar.
 * @returns o id de cada unidade pela sigla (ex.: { STI: 1, ZDC: 2, BRT: 3 })
 */
export async function gravarDadosBase(prisma: PrismaClient): Promise<Record<string, number>> {
  const unidadeId: Record<string, number> = {};
  for (const u of UNIDADES) {
    const unidade = await prisma.unidade.upsert({ where: { sigla: u.sigla }, update: { nome: u.nome }, create: u });
    unidadeId[u.sigla] = unidade.id;
  }
  for (const m of MOTIVOS) {
    await prisma.motivo.upsert({ where: { descricao: m.descricao }, update: { acao: m.acao }, create: m });
  }
  return unidadeId;
}
