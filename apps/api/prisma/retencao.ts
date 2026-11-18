/**
 * prisma/retencao.ts — LGPD: prazo de guarda dos dados pessoais
 *
 * Executado por: npm run db:retencao                      (só mostra, não muda nada)
 *                npm run db:retencao -- --aplicar         (anonimiza de verdade)
 *                npm run db:retencao -- --meses 36        (outro prazo)
 *
 * Procura clientes sem nenhuma revisão aberta na fila e sem nenhuma
 * movimentação (revisão alterada ou ligação registrada) há mais de N meses,
 * e anonimiza cada um (services/privacidade.ts → anonimizarCliente): nome
 * trocado, CPF, celular e observações apagados. Os relatórios de produção
 * continuam iguais.
 *
 * O PRAZO É UMA DECISÃO DA EMPRESA (com o jurídico/encarregado de dados), não
 * do sistema. O padrão de 60 meses (5 anos) é só um ponto de partida; ver
 * docs/lgpd.md, seção "Prazo de guarda". Sugestão: rodar 1 vez por mês, depois
 * do backup, e guardar a saída do comando.
 *
 * Por segurança, sem --aplicar ele só lista quantos e quais ids seriam afetados.
 */

import { prisma } from "../src/db/prisma.js";
import { anonimizarCliente, clientesForaDoPrazo } from "../src/services/privacidade.js";

/** Prazo padrão, em meses, se --meses não for informado. */
const MESES_PADRAO = 60;

/** Lê "--meses N" e "--aplicar" da linha de comando. */
function lerArgumentos(): { meses: number; aplicar: boolean } {
  const args = process.argv.slice(2);
  const i = args.indexOf("--meses");
  const meses = i >= 0 ? Number(args[i + 1]) : MESES_PADRAO;
  if (!Number.isInteger(meses) || meses < 12) {
    throw new Error("--meses precisa ser um número inteiro de pelo menos 12.");
  }
  return { meses, aplicar: args.includes("--aplicar") };
}

async function main() {
  const { meses, aplicar } = lerArgumentos();
  const clientes = await clientesForaDoPrazo(meses);
  console.log(`Prazo de guarda: ${meses} meses. Clientes fora do prazo: ${clientes.length}.`);
  if (clientes.length === 0) return;

  if (!aplicar) {
    console.log(`Ids: ${clientes.map((c) => c.id).join(", ")}`);
    console.log("Nada foi alterado. Para anonimizar, rode de novo com --aplicar (faça um backup antes).");
    return;
  }

  let feitos = 0;
  for (const c of clientes) {
    // usuarioId null: quem fez foi a rotina de retenção (a auditoria guarda o motivo)
    await anonimizarCliente(c.id, null, "PRAZO_DE_GUARDA");
    feitos++;
  }
  console.log(`Anonimizados: ${feitos}. Cada um ficou registrado na auditoria (CLIENTE_ANONIMIZADO).`);
}

main()
  .catch((erro) => {
    console.error("Erro na retenção:", erro.message ?? erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
