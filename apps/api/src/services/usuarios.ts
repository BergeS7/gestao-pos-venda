/**
 * services/usuarios.ts — Cadastro de usuários (Etapa 9, só Admin)
 *
 * Regras:
 *  - usuários NUNCA são apagados, só desativados: o nome continua aparecendo
 *    no histórico de contatos e na auditoria;
 *  - quem é desativado perde o acesso na hora (o middleware confere `ativo`
 *    a cada requisição) e as revisões ABERTAS da carteira dele voltam para
 *    "sem operadora", para o Gestor redistribuir;
 *  - o sistema nunca fica sem nenhum Admin ativo, e o Admin não pode
 *    desativar a si mesmo (evita trancar todo mundo do lado de fora);
 *  - senha definida pelo Admin é PROVISÓRIA: a pessoa troca no primeiro login.
 */

import { prisma } from "../db/prisma.js";
import { Perfil, Prisma, SituacaoRevisao } from "../generated/prisma/client.js";
import { ErroHttp } from "../lib/erros.js";
import { gerarHash } from "../lib/senhas.js";
import type { UsuarioLogado } from "../middleware/auth.js";
import type { AlterarUsuarioParams, CriarUsuarioParams } from "../schemas/usuarios.js";
import { ACOES, auditar } from "./auditoria.js";

/** Campos mostrados na tela de Usuários. O hash da senha nunca sai daqui. */
const camposUsuario = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  trocarSenha: true,
  ultimoAcesso: true,
  criadoEm: true,
  unidade: { select: { id: true, sigla: true } },
} satisfies Prisma.UsuarioSelect;

/** Lista todos os usuários: ativos primeiro, depois por nome. */
export async function listarUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: { ...camposUsuario, senhaHash: true },
  });
  // Diz só SE tem senha, sem mandar o hash
  return usuarios.map(({ senhaHash, ...u }) => ({ ...u, temSenha: senhaHash !== null }));
}

/** Erro 400 no formato padrão, apontando um campo. */
function erroCampo(campo: string, mensagem: string) {
  return new ErroHttp(400, "Dados inválidos na requisição", { campos: { [campo]: [mensagem] } });
}

/** Confere se a unidade existe. */
async function garantirUnidade(unidadeId: number | null | undefined) {
  if (unidadeId == null) return;
  const existe = await prisma.unidade.findUnique({ where: { id: unidadeId }, select: { id: true } });
  if (!existe) throw erroCampo("unidadeId", "Unidade não encontrada");
}

/** Traduz o erro de e-mail repetido do banco (código P2002 do Prisma). */
function eEmailRepetido(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Cria um usuário com senha provisória (trocar no primeiro login).
 * @throws ErroHttp 400 e-mail já cadastrado ou unidade inexistente
 */
export async function criarUsuario(autor: UsuarioLogado, p: CriarUsuarioParams) {
  await garantirUnidade(p.unidadeId);
  const senhaHash = await gerarHash(p.senhaProvisoria);
  try {
    return await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: { nome: p.nome, email: p.email, perfil: p.perfil, unidadeId: p.unidadeId, senhaHash, trocarSenha: true },
        select: camposUsuario,
      });
      await auditar(
        {
          usuarioId: autor.id,
          acao: ACOES.USUARIO_CRIADO,
          entidade: "usuarios",
          entidadeId: u.id,
          detalhes: { nome: u.nome, email: u.email, perfil: u.perfil, unidadeId: p.unidadeId },
        },
        tx,
      );
      return { ...u, temSenha: true };
    });
  } catch (e) {
    if (eEmailRepetido(e)) throw erroCampo("email", "Já existe um usuário com este e-mail");
    throw e;
  }
}

/**
 * Altera nome, e-mail, perfil, unidade ou ativo. Só grava o que foi enviado,
 * e a auditoria guarda o "antes" e o "depois" de cada campo alterado.
 *
 * @returns o usuário e quantas revisões voltaram para "sem operadora" (ao desativar)
 * @throws ErroHttp 400 ao tentar desativar a si mesmo, ou deixar o sistema sem Admin
 * @throws ErroHttp 404 usuário inexistente
 */
export async function alterarUsuario(autor: UsuarioLogado, id: number, p: AlterarUsuarioParams) {
  await garantirUnidade(p.unidadeId);

  try {
    return await prisma.$transaction(async (tx) => {
      const antes = await tx.usuario.findUnique({
        where: { id },
        select: { nome: true, email: true, perfil: true, unidadeId: true, ativo: true },
      });
      if (!antes) throw new ErroHttp(404, "Usuário não encontrado");

      // Proteções contra ficar sem administrador
      if (id === autor.id && p.ativo === false) throw erroCampo("ativo", "Você não pode desativar o próprio usuário");
      if (id === autor.id && p.perfil && p.perfil !== Perfil.ADMIN) {
        throw erroCampo("perfil", "Você não pode tirar o próprio perfil de Admin");
      }
      const deixaDeSerAdmin = antes.perfil === Perfil.ADMIN && antes.ativo && (p.ativo === false || (p.perfil && p.perfil !== Perfil.ADMIN));
      if (deixaDeSerAdmin) {
        const outrosAdmins = await tx.usuario.count({ where: { perfil: Perfil.ADMIN, ativo: true, id: { not: id } } });
        if (outrosAdmins === 0) throw erroCampo("perfil", "O sistema precisa de pelo menos um Admin ativo");
      }

      // Operadora precisa de unidade
      const perfilFinal = p.perfil ?? antes.perfil;
      const unidadeFinal = p.unidadeId !== undefined ? p.unidadeId : antes.unidadeId;
      if (perfilFinal === Perfil.OPERADORA && unidadeFinal === null) throw erroCampo("unidadeId", "Escolha a unidade da operadora");

      const depois = await tx.usuario.update({ where: { id }, data: p, select: camposUsuario });

      // Desativou: libera a carteira aberta para redistribuir
      let revisoesLiberadas = 0;
      if (antes.ativo && p.ativo === false) {
        const { count } = await tx.revisaoAlvo.updateMany({
          where: { operadorId: id, situacao: { not: SituacaoRevisao.CONCLUIDA } },
          data: { operadorId: null, versao: { increment: 1 } },
        });
        revisoesLiberadas = count;
      }

      // Só os campos que realmente mudaram vão para a auditoria
      const mudancas: Record<string, { de: unknown; para: unknown }> = {};
      for (const campo of Object.keys(p) as (keyof typeof antes)[]) {
        if (antes[campo] !== p[campo]) mudancas[campo] = { de: antes[campo], para: p[campo] };
      }
      await auditar(
        {
          usuarioId: autor.id,
          acao: ACOES.USUARIO_ALTERADO,
          entidade: "usuarios",
          entidadeId: id,
          detalhes: { mudancas, ...(revisoesLiberadas > 0 && { revisoesLiberadas }) } as Prisma.InputJsonValue,
        },
        tx,
      );

      return { usuario: depois, revisoesLiberadas };
    });
  } catch (e) {
    if (eEmailRepetido(e)) throw erroCampo("email", "Já existe um usuário com este e-mail");
    throw e;
  }
}

/**
 * O Admin define uma nova senha provisória (ex.: a pessoa esqueceu a dela).
 * Os logins abertos desse usuário deixam de valer na hora.
 * @throws ErroHttp 404 usuário inexistente
 */
export async function redefinirSenha(autor: UsuarioLogado, id: number, senhaProvisoria: string) {
  const existe = await prisma.usuario.findUnique({ where: { id }, select: { id: true } });
  if (!existe) throw new ErroHttp(404, "Usuário não encontrado");

  const senhaHash = await gerarHash(senhaProvisoria);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: { senhaHash, trocarSenha: true } });
    await auditar({ usuarioId: autor.id, acao: ACOES.SENHA_REDEFINIDA, entidade: "usuarios", entidadeId: id }, tx);
  });
}
