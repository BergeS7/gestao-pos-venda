/**
 * prisma/seed.ts — Dados iniciais do banco (somente FICTÍCIOS)
 *
 * Executado por: npx prisma db seed   (ou: npm run db:seed)
 *
 * Insere:
 *  - Dados de apoio REAIS do negócio (não são pessoais), de prisma/dados-base.ts:
 *      • as 3 unidades (STI, ZDC, BRT);
 *      • os 11 motivos de não agendamento usados na planilha.
 *  - Dados de exemplo FICTÍCIOS, para desenvolver e testar telas:
 *      • 1 admin, 1 diretoria, 1 gestor e 3 operadoras, todos com a senha de
 *        desenvolvimento SEED_SENHA (Etapa 9);
 *      • 20 clientes, cada um com 1 moto e 1 revisão na fila.
 *
 * ⚠️ Nunca coloque aqui dados reais de clientes (nome, CPF, telefone).
 *
 * NÃO roda em produção (recusa com NODE_ENV=production). Lá se usa
 * prisma/producao.ts, que só grava unidades, motivos e o primeiro Admin.
 *
 * Idempotente: usa `upsert` (atualiza se já existe, cria se não existe),
 * então pode rodar várias vezes sem duplicar registros.
 */

import { prisma } from "../src/db/prisma.js";
import { gerarHash } from "../src/lib/senhas.js";
import { Perfil, SituacaoRevisao } from "../src/generated/prisma/client.js";
import { gravarDadosBase } from "./dados-base.js";

// ---------------------------------------------------------------------------
// Dados de exemplo (fictícios)
// ---------------------------------------------------------------------------

/**
 * Senha dos usuários fictícios, SÓ para desenvolvimento e testes.
 * Pode ser trocada com SEED_SENHA no .env. Em produção o seed não roda:
 * o primeiro Admin real é criado por prisma/producao.ts (Etapa 11).
 */
const SENHA_DEV = process.env.SEED_SENHA || "Exemplo2026";

/** Usuários fictícios. O domínio .local deixa claro que não são e-mails reais. */
const USUARIOS = [
  { nome: "Admin Exemplo", email: "admin@exemplo.local", perfil: Perfil.ADMIN, unidade: null },
  { nome: "Diretoria Exemplo", email: "diretoria@exemplo.local", perfil: Perfil.DIRETORIA, unidade: null },
  { nome: "Gestor Exemplo", email: "gestor@exemplo.local", perfil: Perfil.GESTOR, unidade: "STI" },
  { nome: "Operadora A", email: "operadora.a@exemplo.local", perfil: Perfil.OPERADORA, unidade: "STI" },
  { nome: "Operadora B", email: "operadora.b@exemplo.local", perfil: Perfil.OPERADORA, unidade: "ZDC" },
  { nome: "Operadora C", email: "operadora.c@exemplo.local", perfil: Perfil.OPERADORA, unidade: "BRT" },
];

/** Modelos que aparecem na planilha real (não são dados pessoais). */
const MODELOS = ["POP 110I ES", "NOVA BIZ 125 EX", "CG 160 FAN", "NXR 160 BROS CBS", "CG 160 TITAN"];
const CORES = ["VERMELHA", "PRETA", "BRANCA PEROLIZADA", "AZUL METÁLICA", "CINZA"];
/** Municípios atendidos e a unidade de cada um (regra provisória, a validar). */
const MUNICIPIOS = [
  { nome: "SANTA INÊS", unidade: "STI" },
  { nome: "PIO XII", unidade: "STI" },
  { nome: "ZÉ DOCA", unidade: "ZDC" },
  { nome: "BURITICUPU", unidade: "BRT" },
];
/** Revisões possíveis, com quantos meses após a venda costumam ser trabalhadas. */
const REVISOES = [
  { km: 1000, meses: 5 },
  { km: 6000, meses: 11 },
  { km: 12000, meses: 18 },
  { km: 18000, meses: 24 },
];
const SITUACOES = [
  SituacaoRevisao.PENDENTE,
  SituacaoRevisao.PENDENTE,
  SituacaoRevisao.RETORNAR,
  SituacaoRevisao.AGENDADO,
  SituacaoRevisao.NAO_AGENDADO,
  SituacaoRevisao.BUSCAR_CONTATO,
  SituacaoRevisao.CONCLUIDA,
];
const TOTAL_CLIENTES = 20;

/** Completa um número com zeros à esquerda. Ex.: zeros(7, 2) → "07". */
function zeros(n: number, tamanho: number): string {
  return String(n).padStart(tamanho, "0");
}

/** Data de hoje menos N meses (para simular a data de venda). */
function mesesAtras(meses: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d;
}

async function main() {
  // Este seed cria clientes e usuários FICTÍCIOS: nunca pode rodar em produção.
  // Para a produção existe o prisma/producao.ts (npm run db:producao).
  if (process.env.NODE_ENV === "production") {
    throw new Error("O seed tem dados fictícios e não roda em produção. Use: npm run db:producao");
  }

  console.log("Seed: unidades e motivos...");
  const unidadeId = await gravarDadosBase(prisma);

  console.log("Seed: usuários fictícios...");
  const senhaHash = await gerarHash(SENHA_DEV);
  const operadoras: number[] = [];
  for (const u of USUARIOS) {
    const unidade = u.unidade ? unidadeId[u.unidade] : null;
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nome: u.nome, perfil: u.perfil, unidadeId: unidade },
      create: { nome: u.nome, email: u.email, perfil: u.perfil, unidadeId: unidade, senhaHash },
    });
    // Quem ainda não tem senha recebe a de desenvolvimento. Quem já trocou mantém a dele.
    if (!usuario.senhaHash && senhaHash) {
      await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash } });
    }
    if (u.perfil === Perfil.OPERADORA) operadoras.push(usuario.id);
  }

  console.log(`Seed: ${TOTAL_CLIENTES} clientes, motos e revisões fictícios...`);
  for (let i = 1; i <= TOTAL_CLIENTES; i++) {
    const nn = zeros(i, 2);
    const municipio = MUNICIPIOS[i % MUNICIPIOS.length];
    const revisao = REVISOES[i % REVISOES.length];

    // CPF e celular claramente falsos (zeros + sequência)
    const cliente = await prisma.cliente.upsert({
      where: { cpfCnpj: `000000000${nn}` },
      update: {},
      create: {
        nome: `CLIENTE EXEMPLO ${nn}`,
        cpfCnpj: `000000000${nn}`,
        celular: `98900000${zeros(i, 3)}`,
        municipio: municipio.nome,
      },
    });

    // Chassi fictício com 17 caracteres: "9C2TST0000T0000" + 2 dígitos
    const veiculo = await prisma.veiculo.upsert({
      where: { chassi: `9C2TST0000T0000${nn}` },
      update: {},
      create: {
        chassi: `9C2TST0000T0000${nn}`,
        modelo: MODELOS[i % MODELOS.length],
        cor: CORES[i % CORES.length],
        dataVenda: mesesAtras(revisao.meses),
        clienteId: cliente.id,
      },
    });

    await prisma.revisaoAlvo.upsert({
      where: { veiculoId_km: { veiculoId: veiculo.id, km: revisao.km } },
      update: {},
      create: {
        veiculoId: veiculo.id,
        km: revisao.km,
        situacao: SITUACOES[i % SITUACOES.length],
        unidadeId: unidadeId[municipio.unidade],
        operadorId: operadoras[i % operadoras.length],
      },
    });
  }

  console.log("Seed concluído.");
}

main()
  .catch((erro) => {
    console.error("Erro no seed:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Sempre fecha a conexão, com ou sem erro
    await prisma.$disconnect();
  });
