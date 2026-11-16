/**
 * prisma/producao.ts — Prepara o banco de PRODUÇÃO (Etapa 11)
 *
 * Executado por: npm run db:producao   (depois de "npm run db:deploy")
 *
 * Diferente do seed, NÃO cria nada fictício. Faz só:
 *  1. grava unidades e motivos (prisma/dados-base.ts);
 *  2. cria o PRIMEIRO Admin, se ainda não existir nenhum Admin ativo.
 *
 * Os dados do primeiro Admin vêm de variáveis de ambiente, só nesta execução
 * (não precisam ficar no .env do servidor depois):
 *   ADMIN_NOME              nome completo
 *   ADMIN_EMAIL             e-mail de login
 *   ADMIN_SENHA_PROVISORIA  senha provisória (8+ caracteres, letras e números)
 *
 * A senha é PROVISÓRIA: no primeiro login o sistema obriga a criar outra
 * (trocar_senha = true). Depois, os demais usuários são criados na tela
 * Usuários, pelo próprio Admin.
 *
 * Pode rodar de novo sem problema: se já houver Admin ativo, só atualiza
 * unidades e motivos.
 */

import { prisma } from "../src/db/prisma.js";
import { gerarHash } from "../src/lib/senhas.js";
import { Perfil } from "../src/generated/prisma/client.js";
import { emailSchema, novaSenhaSchema } from "../src/schemas/auth.js";
import { ACOES, auditar } from "../src/services/auditoria.js";
import { gravarDadosBase } from "./dados-base.js";

async function main() {
  console.log("Produção: unidades e motivos...");
  await gravarDadosBase(prisma);

  const admins = await prisma.usuario.count({ where: { perfil: Perfil.ADMIN, ativo: true } });
  if (admins > 0) {
    console.log(`Produção: já existe Admin ativo (${admins}). Nenhum usuário foi criado.`);
    return;
  }

  const nome = process.env.ADMIN_NOME?.trim();
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? "");
  const senha = novaSenhaSchema.safeParse(process.env.ADMIN_SENHA_PROVISORIA ?? "");
  const problemas = [
    !nome && "ADMIN_NOME não informado",
    !email.success && "ADMIN_EMAIL ausente ou inválido",
    !senha.success && `ADMIN_SENHA_PROVISORIA: ${senha.error?.issues[0]?.message ?? "inválida"}`,
  ].filter(Boolean);
  if (problemas.length || !email.success || !senha.success) {
    throw new Error(`Para criar o primeiro Admin, corrija: ${problemas.join("; ")}.`);
  }

  const admin = await prisma.usuario.create({
    data: {
      nome: nome!,
      email: email.data,
      perfil: Perfil.ADMIN,
      senhaHash: await gerarHash(senha.data),
      trocarSenha: true, // obriga a criar uma senha própria no primeiro login
    },
  });
  await auditar({
    usuarioId: admin.id,
    acao: ACOES.USUARIO_CRIADO,
    entidade: "usuarios",
    entidadeId: admin.id,
    detalhes: { origem: "implantacao", perfil: Perfil.ADMIN },
  });
  // A senha nunca é exibida nem registrada
  console.log(`Produção: primeiro Admin criado (${admin.email}). No primeiro login será pedida uma senha nova.`);
}

main()
  .catch((erro) => {
    console.error("Erro ao preparar a produção:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
