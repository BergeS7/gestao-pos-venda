/**
 * services/importacao.ts — Importação dos relatórios do Cloud, em duas fases (Etapa 6)
 *
 * Fluxo (tela Importações, Gestor e Admin):
 *   1. PRÉVIA: o usuário envia a lista de revisões e/ou o espelhamento de OS.
 *      O sistema lê (importacao/leitura.ts), limpa e valida (normalizar.ts),
 *      cruza por chassi (cruzamento.ts) e mostra os números. NADA entra na fila.
 *      As linhas lidas ficam guardadas em importacoes.previa (JSON).
 *   2. CONFIRMAÇÃO: o sistema refaz o cruzamento com o banco ATUAL (alguém pode
 *      ter importado ou concluído algo no meio tempo) e grava tudo numa
 *      transação: clientes, motos, revisões elegíveis (sem operadora, para o
 *      Gestor distribuir), ordens de serviço e conclusões automáticas.
 *   Ou CANCELAMENTO: nada é gravado.
 *
 * LGPD: a prévia guarda dados pessoais (nome, CPF, celular) só enquanto não é
 * confirmada ou cancelada; depois o campo `previa` é apagado e fica só o resumo
 * com números. Prévias esquecidas por mais de 24 h são canceladas sozinhas.
 * Moto de cliente anonimizado não volta pela importação (docs/lgpd.md).
 *
 * Regras de negócio: docs/regras-de-negocio.md, seções 2 e 3.
 */

import { prisma } from "../db/prisma.js";
import { Prisma, SituacaoRevisao, StatusImportacao, TipoImportacao } from "../generated/prisma/client.js";
import { ErroHttp } from "../lib/erros.js";
import { documentoMascarado } from "../lib/formatar.js";
import type { UsuarioLogado } from "../middleware/auth.js";
import { ACOES, auditar } from "./auditoria.js";
import {
  agruparOs,
  chaveRevisao,
  classificarRevisoes,
  conclusoesAutomaticas,
  unidadeDoMunicipio,
  type OsConhecida,
} from "./importacao/cruzamento.js";
import {
  COLUNAS_ESPELHAMENTO,
  COLUNAS_REVISOES,
  lerPlanilha,
  OBRIGATORIAS_ESPELHAMENTO,
  OBRIGATORIAS_REVISOES,
} from "./importacao/leitura.js";
import {
  normalizarEspelhamento,
  normalizarRevisoes,
  type Normalizado,
  type OsImportada,
  type RevisaoImportada,
} from "./importacao/normalizar.js";

/** Arquivo recebido no upload. */
export type ArquivoEnviado = { buffer: Buffer; nome: string };

/** O que fica guardado em importacoes.previa entre a prévia e a confirmação. */
type DadosPrevia = {
  exigirTipoOs: boolean;
  revisoes: Normalizado<RevisaoImportada> | null;
  espelhamento: Normalizado<OsImportada> | null;
};

/** Máximo de linhas de cada lista devolvida para a tela (os totais são sempre completos). */
const MAX_AMOSTRA = 300;

/** Prévia sem confirmação depois deste tempo é cancelada (não guardar dados pessoais à toa). */
const VALIDADE_PREVIA_MS = 24 * 60 * 60 * 1000;

/** Tempo máximo da transação de confirmação (arquivos com milhares de linhas). */
const TEMPO_CONFIRMACAO_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Análise (usada na prévia, na tela de detalhe e na confirmação)
// ---------------------------------------------------------------------------

/** Linha da lista para mostrar na tela: sem CPF completo. */
function paraTela(r: RevisaoImportada) {
  const { cpf, ...resto } = r;
  return { ...resto, documento: documentoMascarado(cpf), unidade: unidadeDoMunicipio(r.municipio) };
}

/**
 * Cruza as linhas guardadas com o que está no banco AGORA.
 * Não grava nada: devolve os números, as listas e o que a confirmação faria.
 */
async function analisar(dados: DadosPrevia) {
  const validas = dados.revisoes?.validas ?? [];
  const osArquivo = dados.espelhamento?.validas ?? [];
  const chassisLista = [...new Set(validas.map((r) => r.chassi))];
  const chassisOs = [...new Set(osArquivo.map((o) => o.chassi))];

  const [naFila, anonimizados, osBanco, abertas] = await Promise.all([
    prisma.revisaoAlvo.findMany({
      where: { veiculo: { chassi: { in: chassisLista } } },
      select: { km: true, veiculo: { select: { chassi: true } } },
    }),
    prisma.veiculo.findMany({
      where: { chassi: { in: chassisLista }, cliente: { anonimizadoEm: { not: null } } },
      select: { chassi: true },
    }),
    prisma.ordemServico.findMany({
      where: { chassi: { in: [...new Set([...chassisLista, ...chassisOs])] } },
      select: { chassi: true, tipoOs: true },
    }),
    prisma.revisaoAlvo.findMany({
      where: { concluida: false, veiculo: { chassi: { in: chassisOs } } },
      select: { id: true, km: true, veiculo: { select: { chassi: true } } },
    }),
  ]);

  // OS do arquivo que ainda não estão no banco (mesmo chassi + tipo), sem repetir
  const osJaGravadas = new Set(osBanco.map((o) => `${o.chassi}|${o.tipoOs}`));
  const osNovas: OsImportada[] = [];
  for (const os of osArquivo) {
    const chave = `${os.chassi}|${os.tipoOs}`;
    if (!osJaGravadas.has(chave)) {
      osJaGravadas.add(chave);
      osNovas.push(os);
    }
  }

  const conhecidas: OsConhecida[] = [
    ...osArquivo.map((o) => ({ chassi: o.chassi, tipoOs: o.tipoOs, origem: "arquivo" as const })),
    ...osBanco.map((o) => ({ chassi: o.chassi, tipoOs: o.tipoOs, origem: "banco" as const })),
  ];
  const classificacao = classificarRevisoes(validas, {
    jaNaFila: new Set(naFila.map((r) => chaveRevisao(r.veiculo.chassi, r.km))),
    chassisAnonimizados: new Set(anonimizados.map((v) => v.chassi)),
    osPorChassi: agruparOs(conhecidas),
    exigirTipoOs: dados.exigirTipoOs,
  });
  const conclusoes = conclusoesAutomaticas(
    abertas.map((r) => ({ id: r.id, km: r.km, chassi: r.veiculo.chassi })),
    osArquivo,
  );

  const { elegiveis } = classificacao;
  const resumo = {
    exigirTipoOs: dados.exigirTipoOs,
    revisoes: dados.revisoes
      ? {
          lidas: dados.revisoes.validas.length + dados.revisoes.invalidas.length,
          invalidas: dados.revisoes.invalidas.length,
          validas: validas.length,
          duplicadas: classificacao.duplicadas.length,
          jaNaFila: classificacao.jaNaFila.length,
          anonimizados: classificacao.anonimizados.length,
          comOs: classificacao.comOs.length,
          elegiveis: elegiveis.length,
          elegiveisSemUnidade: elegiveis.filter((r) => !unidadeDoMunicipio(r.municipio)).length,
          elegiveisComAviso: elegiveis.filter((r) => r.avisos.length > 0).length,
        }
      : null,
    espelhamento: dados.espelhamento
      ? {
          lidas: dados.espelhamento.validas.length + dados.espelhamento.invalidas.length,
          invalidas: dados.espelhamento.invalidas.length,
          validas: osArquivo.length,
          novas: osNovas.length,
          conclusoes: conclusoes.length,
        }
      : null,
  };

  const amostra = <T>(lista: T[]) => lista.slice(0, MAX_AMOSTRA);
  const listas = {
    invalidas: amostra(dados.revisoes?.invalidas ?? []),
    duplicadas: amostra(classificacao.duplicadas.map(paraTela)),
    jaNaFila: amostra(classificacao.jaNaFila.map(paraTela)),
    anonimizados: amostra(classificacao.anonimizados.map((r) => ({ numero: r.numero, chassi: r.chassi, km: r.km }))),
    comOs: amostra(classificacao.comOs.map((r) => ({ ...paraTela(r), tipoOs: r.tipoOs }))),
    elegiveis: amostra(elegiveis.map(paraTela)),
    osInvalidas: amostra(dados.espelhamento?.invalidas ?? []),
    conclusoes: amostra(conclusoes),
  };

  return { resumo, listas, gravar: { elegiveis, osNovas, conclusoes } };
}

/** Resumo de uma importação (o que a tela e a auditoria mostram). */
export type ResumoImportacao = Awaited<ReturnType<typeof analisar>>["resumo"];

// ---------------------------------------------------------------------------
// Fase 1: prévia
// ---------------------------------------------------------------------------

/**
 * Lê os arquivos, cruza e guarda a prévia (status PREVIA). Nada entra na fila.
 * @throws ErroHttp 400 sem arquivo, formato não aceito ou cabeçalho não encontrado
 */
export async function gerarPrevia(
  usuario: UsuarioLogado,
  arquivos: { revisoes?: ArquivoEnviado; espelhamento?: ArquivoEnviado },
  exigirTipoOs: boolean,
) {
  if (!arquivos.revisoes && !arquivos.espelhamento) {
    throw new ErroHttp(400, "Envie a lista de revisões, o espelhamento de OS ou os dois.");
  }

  const dados: DadosPrevia = {
    exigirTipoOs,
    revisoes: arquivos.revisoes
      ? normalizarRevisoes(
          await lerPlanilha(arquivos.revisoes.buffer, arquivos.revisoes.nome, COLUNAS_REVISOES, OBRIGATORIAS_REVISOES),
        )
      : null,
    espelhamento: arquivos.espelhamento
      ? normalizarEspelhamento(
          await lerPlanilha(
            arquivos.espelhamento.buffer,
            arquivos.espelhamento.nome,
            COLUNAS_ESPELHAMENTO,
            OBRIGATORIAS_ESPELHAMENTO,
          ),
        )
      : null,
  };

  await cancelarPreviasVencidas();
  const analise = await analisar(dados);
  const principal = arquivos.revisoes ?? arquivos.espelhamento!;
  const totais = analise.resumo.revisoes ?? analise.resumo.espelhamento!;

  const importacao = await prisma.importacao.create({
    data: {
      tipo: arquivos.revisoes ? TipoImportacao.REVISOES : TipoImportacao.ESPELHAMENTO,
      arquivo: principal.nome.slice(0, 255),
      arquivoEspelhamento: arquivos.revisoes && arquivos.espelhamento ? arquivos.espelhamento.nome.slice(0, 255) : null,
      totalLinhas: totais.lidas,
      totalValidos: totais.validas,
      totalInvalidos: totais.invalidas,
      status: StatusImportacao.PREVIA,
      usuarioId: usuario.id,
      resumo: analise.resumo as Prisma.InputJsonValue,
      previa: dados as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return { id: importacao.id, status: StatusImportacao.PREVIA, resumo: analise.resumo, listas: analise.listas };
}

/** Cancela prévias com mais de 24 h (e apaga as linhas guardadas). */
async function cancelarPreviasVencidas() {
  await prisma.importacao.updateMany({
    where: { status: StatusImportacao.PREVIA, criadoEm: { lt: new Date(Date.now() - VALIDADE_PREVIA_MS) } },
    data: { status: StatusImportacao.CANCELADA, previa: Prisma.DbNull },
  });
}

/** Busca uma importação em prévia ou explica por que não dá. */
async function previaAberta(id: number) {
  const imp = await prisma.importacao.findUnique({ where: { id }, select: { id: true, status: true, previa: true } });
  if (!imp) throw new ErroHttp(404, "Importação não encontrada");
  if (imp.status !== StatusImportacao.PREVIA || !imp.previa) {
    throw new ErroHttp(409, "Esta importação já foi confirmada ou cancelada.", { status: imp.status });
  }
  return { id: imp.id, dados: imp.previa as unknown as DadosPrevia };
}

// ---------------------------------------------------------------------------
// Fase 2: confirmação ou cancelamento
// ---------------------------------------------------------------------------

/**
 * Grava a importação: refaz o cruzamento com o banco atual e, numa transação,
 * cria clientes/motos/revisões elegíveis, grava as OS novas e conclui as
 * revisões comprovadas pelo espelhamento.
 *
 * @throws ErroHttp 404 não encontrada; 409 já confirmada/cancelada
 */
export async function confirmarImportacao(usuario: UsuarioLogado, id: number) {
  const { dados } = await previaAberta(id);
  const analise = await analisar(dados);
  const { elegiveis, osNovas, conclusoes } = analise.gravar;

  const unidades = await prisma.unidade.findMany({ select: { id: true, sigla: true } });
  const unidadeId = new Map(unidades.map((u) => [u.sigla, u.id]));

  const gravado = await prisma.$transaction(
    async (tx) => {
      // Garante que ninguém confirmou ao mesmo tempo (só um passa de PREVIA para CONFIRMADA)
      const trava = await tx.importacao.updateMany({
        where: { id, status: StatusImportacao.PREVIA },
        data: { status: StatusImportacao.CONFIRMADA, confirmadaEm: new Date() },
      });
      if (trava.count === 0) throw new ErroHttp(409, "Esta importação já foi confirmada ou cancelada.");

      // 1. Clientes, motos e revisões
      const clientePorCpf = new Map<string, number>();
      const veiculoPorChassi = new Map<string, number>();
      let clientesNovos = 0;
      let veiculosNovos = 0;
      for (const r of elegiveis) {
        let veiculoId = veiculoPorChassi.get(r.chassi);
        if (!veiculoId) {
          const existente = await tx.veiculo.findUnique({
            where: { chassi: r.chassi },
            select: { id: true, clienteId: true },
          });
          if (existente) {
            veiculoId = existente.id;
            // Atualiza o contato com o dado mais novo do Cloud (só o que veio preenchido)
            if (r.celular || r.municipio) {
              await tx.cliente.update({
                where: { id: existente.clienteId },
                data: { ...(r.celular && { celular: r.celular }), ...(r.municipio && { municipio: r.municipio }) },
              });
            }
          } else {
            let clienteId = r.cpf ? clientePorCpf.get(r.cpf) : undefined;
            if (!clienteId && r.cpf) {
              clienteId = (await tx.cliente.findUnique({ where: { cpfCnpj: r.cpf }, select: { id: true } }))?.id;
            }
            if (!clienteId) {
              clienteId = (
                await tx.cliente.create({
                  data: { nome: r.nome, cpfCnpj: r.cpf, celular: r.celular, municipio: r.municipio },
                  select: { id: true },
                })
              ).id;
              clientesNovos++;
            }
            if (r.cpf) clientePorCpf.set(r.cpf, clienteId);
            veiculoId = (
              await tx.veiculo.create({
                data: {
                  chassi: r.chassi,
                  modelo: r.modelo,
                  cor: r.cor,
                  dataVenda: r.dataVenda ? new Date(`${r.dataVenda}T12:00:00Z`) : null,
                  clienteId,
                },
                select: { id: true },
              })
            ).id;
            veiculosNovos++;
          }
          veiculoPorChassi.set(r.chassi, veiculoId);
        }
        const sigla = unidadeDoMunicipio(r.municipio);
        await tx.revisaoAlvo.create({
          data: {
            veiculoId,
            km: r.km,
            situacao: SituacaoRevisao.PENDENTE,
            unidadeId: sigla ? (unidadeId.get(sigla) ?? null) : null,
            importacaoId: id,
          },
        });
      }

      // 2. Ordens de serviço novas
      if (osNovas.length > 0) {
        await tx.ordemServico.createMany({
          data: osNovas.map((o) => ({
            chassi: o.chassi,
            tipoOs: o.tipoOs.slice(0, 80),
            codigoAssistencia: o.codigoAssistencia?.slice(0, 20) ?? null,
            importacaoId: id,
          })),
        });
      }

      // 3. Conclusões automáticas (só as que continuam abertas)
      const concluidas = await tx.revisaoAlvo.updateMany({
        where: { id: { in: conclusoes.map((c) => c.id) }, concluida: false },
        data: { concluida: true, situacao: SituacaoRevisao.CONCLUIDA, proximoContato: null, versao: { increment: 1 } },
      });

      const resultado = {
        revisoesCriadas: elegiveis.length,
        clientesNovos,
        veiculosNovos,
        osGravadas: osNovas.length,
        revisoesConcluidas: concluidas.count,
      };

      // 4. Fecha a importação: apaga as linhas guardadas (dados pessoais) e fica o resumo
      await tx.importacao.update({
        where: { id },
        data: {
          previa: Prisma.DbNull,
          resumo: { ...analise.resumo, resultado } as Prisma.InputJsonValue,
        },
      });
      await auditar(
        {
          usuarioId: usuario.id,
          acao: ACOES.IMPORTACAO_CONFIRMADA,
          entidade: "importacoes",
          entidadeId: id,
          detalhes: resultado,
        },
        tx,
      );
      return resultado;
    },
    { timeout: TEMPO_CONFIRMACAO_MS, maxWait: 10_000 },
  );

  return { id, status: StatusImportacao.CONFIRMADA, resumo: analise.resumo, resultado: gravado };
}

/**
 * Cancela a prévia: nada é gravado e as linhas guardadas são apagadas.
 * @throws ErroHttp 404 não encontrada; 409 já confirmada/cancelada
 */
export async function cancelarImportacao(usuario: UsuarioLogado, id: number) {
  await previaAberta(id);
  await prisma.$transaction(async (tx) => {
    await tx.importacao.update({ where: { id }, data: { status: StatusImportacao.CANCELADA, previa: Prisma.DbNull } });
    await auditar(
      { usuarioId: usuario.id, acao: ACOES.IMPORTACAO_CANCELADA, entidade: "importacoes", entidadeId: id },
      tx,
    );
  });
  return { id, status: StatusImportacao.CANCELADA };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** Campos do histórico (sem a prévia, que tem dados pessoais). */
const camposHistorico = {
  id: true,
  tipo: true,
  arquivo: true,
  arquivoEspelhamento: true,
  totalLinhas: true,
  totalValidos: true,
  totalInvalidos: true,
  status: true,
  resumo: true,
  criadoEm: true,
  confirmadaEm: true,
  usuario: { select: { id: true, nome: true } },
} satisfies Prisma.ImportacaoSelect;

/** Últimas 50 importações, da mais nova para a mais antiga. */
export async function listarImportacoes() {
  await cancelarPreviasVencidas();
  return prisma.importacao.findMany({ orderBy: { id: "desc" }, take: 50, select: camposHistorico });
}

/**
 * Uma importação. Se ainda está em prévia, refaz a análise para mostrar as listas.
 * @throws ErroHttp 404 não encontrada
 */
export async function detalharImportacao(id: number) {
  const imp = await prisma.importacao.findUnique({ where: { id }, select: { ...camposHistorico, previa: true } });
  if (!imp) throw new ErroHttp(404, "Importação não encontrada");
  const { previa, ...dados } = imp;
  if (imp.status === StatusImportacao.PREVIA && previa) {
    const analise = await analisar(previa as unknown as DadosPrevia);
    return { ...dados, resumo: analise.resumo, listas: analise.listas };
  }
  return { ...dados, listas: null };
}
