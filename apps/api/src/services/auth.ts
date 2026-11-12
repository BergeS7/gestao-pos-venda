/**
 * services/auth.ts — Login e troca de senha (Etapa 9)
 *
 * Regras:
 *  - e-mail ou senha errados → sempre a MESMA mensagem, sem dizer qual dos
 *    dois errou (para não revelar quais e-mails existem);
 *  - usuário desativado ou ainda sem senha não entra (mesma mensagem);
 *  - 5 erros seguidos bloqueiam por 15 minutos (lib/limiteLogin.ts);
 *  - todo login, certo ou errado, vai para a auditoria.
 */

import { prisma } from "../db/prisma.js";
import { ErroHttp } from "../lib/erros.js";
import { limparFalhas, minutosBloqueado, registrarFalha } from "../lib/limiteLogin.js";
import { conferirSenha, gerarHash, impressaoDaSenha } from "../lib/senhas.js";
import { criarToken } from "../lib/tokens.js";
import type { UsuarioLogado } from "../middleware/auth.js";
import type { LoginParams, TrocarSenhaParams } from "../schemas/auth.js";
import { ACOES, auditar } from "./auditoria.js";

/** Campos do usuário devolvidos ao frontend depois do login (sem hash). */
export const camposUsuarioLogado = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  unidadeId: true,
  trocarSenha: true,
} as const;

/** Mensagem única para qualquer falha de login. */
const MSG_LOGIN_INVALIDO = "E-mail ou senha incorretos.";

/**
 * Confere e-mail e senha e cria o token de sessão.
 *
 * @param ip endereço de quem tenta entrar (para o limite de tentativas)
 * @returns o usuário e o token, que a rota coloca no cookie
 * @throws ErroHttp 401 e-mail ou senha incorretos
 * @throws ErroHttp 429 muitas tentativas erradas
 */
export async function entrar({ email, senha }: LoginParams, ip: string) {
  const bloqueio = minutosBloqueado(email, ip);
  if (bloqueio > 0) {
    throw new ErroHttp(429, `Muitas tentativas erradas. Tente de novo em ${bloqueio} min.`);
  }

  const u = await prisma.usuario.findUnique({
    where: { email },
    select: { ...camposUsuarioLogado, ativo: true, senhaHash: true },
  });

  // conferirSenha roda o bcrypt mesmo sem usuário, para levar o mesmo tempo
  const senhaOk = await conferirSenha(senha, u?.senhaHash);
  if (!u || !u.ativo || !u.senhaHash || !senhaOk) {
    registrarFalha(email, ip);
    await auditar({
      usuarioId: u?.id ?? null,
      acao: ACOES.LOGIN_FALHOU,
      entidade: "usuarios",
      entidadeId: u?.id ?? null,
      // E-mail digitado só quando ele não existe (ajuda a ver tentativas de invasão)
      detalhes: u ? { motivo: !u.ativo ? "inativo" : "senha" } : { emailDigitado: email },
    });
    throw new ErroHttp(401, MSG_LOGIN_INVALIDO);
  }

  limparFalhas(email);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: u.id }, data: { ultimoAcesso: new Date() } });
    await auditar({ usuarioId: u.id, acao: ACOES.LOGIN, entidade: "usuarios", entidadeId: u.id }, tx);
  });

  const { ativo: _ativo, senhaHash, ...usuario } = u;
  return { usuario: usuario satisfies UsuarioLogado, token: criarToken(u.id, impressaoDaSenha(senhaHash)) };
}

/**
 * A própria pessoa troca a senha (inclusive a provisória, definida pelo Admin).
 * Devolve um token novo: os logins abertos em outros computadores deixam de valer.
 *
 * @throws ErroHttp 400 senha atual incorreta
 */
export async function trocarSenha(usuario: UsuarioLogado, { senhaAtual, novaSenha }: TrocarSenhaParams) {
  const atual = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id }, select: { senhaHash: true } });
  if (!(await conferirSenha(senhaAtual, atual.senhaHash))) {
    throw new ErroHttp(400, "Dados inválidos na requisição", { campos: { senhaAtual: ["Senha atual incorreta"] } });
  }

  const hash = await gerarHash(novaSenha);
  const atualizado = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash: hash, trocarSenha: false },
      select: camposUsuarioLogado,
    });
    await auditar({ usuarioId: usuario.id, acao: ACOES.SENHA_TROCADA, entidade: "usuarios", entidadeId: usuario.id }, tx);
    return u;
  });

  return { usuario: atualizado satisfies UsuarioLogado, token: criarToken(usuario.id, impressaoDaSenha(hash)) };
}
