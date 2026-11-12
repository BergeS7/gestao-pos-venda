/**
 * prisma/seed.ts — Dados iniciais do banco (somente FICTÍCIOS)
 *
 * Executado por: npx prisma db seed   (ou: npm run db:seed)
 *
 * Insere:
 *  - Dados de apoio REAIS do negócio (não são pessoais):
 *      • as 3 unidades (STI, ZDC, BRT);
 *      • os 11 motivos de não agendamento usados na planilha.
 *  - Dados de exemplo FICTÍCIOS, para desenvolver e testar telas:
 *      • 1 gestor e 3 operadoras;
 *      • 20 clientes, cada um com 1 moto e 1 revisão na fila.
 *
 * ⚠️ Nunca coloque aqui dados reais de clientes (nome, CPF, telefone).
 *
 * Idempotente: usa `upsert` (atualiza se já existe, cria se não existe),
 * então pode rodar várias vezes sem duplicar registros.
 */

import { prisma } from "../src/db/prisma.js";
import { AcaoMotivo, Perfil, SituacaoRevisao } from "../src/generated/prisma/client.js";

// ---------------------------------------------------------------------------
// Dados de apoio (reais, não pessoais)
// ---------------------------------------------------------------------------

/** Unidades da concessionária, conforme o relatório de produção. */
const UNIDADES = [
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
const MOTIVOS = [
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

// ---------------------------------------------------------------------------
// Dados de exemplo (fictícios)
// ---------------------------------------------------------------------------

/** Usuários fictícios. O domínio .local deixa claro que não são e-mails reais. */
const USUARIOS = [
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
  console.log("Seed: unidades e motivos...");

  // Unidades: guarda o id de cada sigla para usar nas relações abaixo
  const unidadeId: Record<string, number> = {};
  for (const u of UNIDADES) {
    const unidade = await prisma.unidade.upsert({
      where: { sigla: u.sigla },
      update: { nome: u.nome },
      create: u,
    });
    unidadeId[u.sigla] = unidade.id;
  }

  for (const m of MOTIVOS) {
    await prisma.motivo.upsert({
      where: { descricao: m.descricao },
      update: { acao: m.acao },
      create: m,
    });
  }

  console.log("Seed: usuários fictícios...");
  const operadoras: number[] = [];
  for (const u of USUARIOS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nome: u.nome, perfil: u.perfil, unidadeId: unidadeId[u.unidade] },
      create: { nome: u.nome, email: u.email, perfil: u.perfil, unidadeId: unidadeId[u.unidade] },
    });
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
