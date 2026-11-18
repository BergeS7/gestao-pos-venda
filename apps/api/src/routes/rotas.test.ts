/**
 * routes/rotas.test.ts — Testes das rotas da API com banco de verdade
 *
 * Diferente dos outros testes (regras puras), estes ligam a API e fazem
 * requisições HTTP, como o navegador faria, contra um banco de TESTES com os
 * dados fictícios do seed. Conferem o que mais importa antes do piloto:
 *
 *  - login: senha errada, cookie de sessão protegido (httpOnly), sair;
 *  - permissões: quem não está logado recebe 401; perfil sem permissão, 403;
 *  - carteira: a operadora só vê e só mexe nas revisões dela;
 *  - atendimento: registrar ligação, validações e proteção contra sobrescrita (409);
 *  - exportação CSV sem CPF;
 *  - LGPD: acessos auditados, busca do titular, anonimização e prazo de guarda.
 *
 * Precisam de DATABASE_URL_TESTE (nome do banco terminando em "_teste"); sem
 * ela são pulados. Como preparar: README, seção "Testes", e src/teste/prepararBanco.ts.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hoje, somarDias } from "../lib/datas.js";
import { entrar, iniciarApi, pararApi, req, USUARIOS_TESTE as U } from "../teste/cliente.js";

/** Formato de cada item da fila, só com o que os testes usam. */
type ItemFila = {
  id: number;
  situacao: string;
  versao: number;
  operador: { id: number } | null;
  veiculo: { cliente: { id: number } };
};

describe.skipIf(!process.env.DATABASE_URL_TESTE)("rotas da API (banco de testes)", () => {
  /** Cookies de sessão de cada perfil, obtidos uma vez. */
  const sessao: Record<keyof typeof U, string> = {} as never;

  beforeAll(async () => {
    await iniciarApi();
    for (const chave of Object.keys(U) as (keyof typeof U)[]) sessao[chave] = await entrar(U[chave]);
  });

  afterAll(pararApi);

  describe("abertas e login", () => {
    it("health responde sem login", async () => {
      const r = await req("GET", "/api/health");
      expect(r.status).toBe(200);
      expect(r.corpo.ok).toBe(true);
    });

    it("senha errada dá 401 com mensagem que não diz se o e-mail existe", async () => {
      const r = await req("POST", "/api/auth/login", { corpo: { email: U.gestor, senha: "errada123" } });
      expect(r.status).toBe(401);
      const outro = await req("POST", "/api/auth/login", {
        corpo: { email: "ninguem@exemplo.local", senha: "errada123" },
      });
      expect(outro.corpo.error).toBe(r.corpo.error);
    });

    it("login grava cookie httpOnly e SameSite=Strict", async () => {
      const r = await req("POST", "/api/auth/login", { corpo: { email: U.admin, senha: process.env.SEED_SENHA } });
      expect(r.status).toBe(200);
      expect(r.corpo).not.toHaveProperty("senhaHash");
      const cookie = r.headers.get("set-cookie") ?? "";
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
    });

    it("/auth/eu devolve quem está logado; sair apaga o cookie", async () => {
      const eu = await req("GET", "/api/auth/eu", { cookie: sessao.operadoraA });
      expect(eu.status).toBe(200);
      expect(eu.corpo.perfil).toBe("OPERADORA");
      const sair = await req("POST", "/api/auth/logout", { cookie: sessao.operadoraA });
      expect(sair.status).toBe(204);
      expect(sair.headers.get("set-cookie")).toMatch(/sessao=;/);
    });

    it("cookie inventado não entra", async () => {
      const r = await req("GET", "/api/revisoes", { cookie: "sessao=token-falso" });
      expect(r.status).toBe(401);
    });
  });

  describe("permissões", () => {
    it.each(["/api/revisoes", "/api/revisoes/agenda", "/api/unidades", "/api/relatorios/producao", "/api/usuarios"])(
      "sem login, %s dá 401",
      async (caminho) => {
        expect((await req("GET", caminho)).status).toBe(401);
      },
    );

    it("só o Admin vê usuários e auditoria", async () => {
      for (const quem of ["operadoraA", "gestor", "diretoria"] as const) {
        expect((await req("GET", "/api/usuarios", { cookie: sessao[quem] })).status).toBe(403);
        expect((await req("GET", "/api/auditoria", { cookie: sessao[quem] })).status).toBe(403);
      }
      expect((await req("GET", "/api/usuarios", { cookie: sessao.admin })).status).toBe(200);
    });

    it("operadora e diretoria não distribuem a fila", async () => {
      for (const quem of ["operadoraA", "diretoria"] as const) {
        const r = await req("POST", "/api/revisoes/distribuir", { cookie: sessao[quem], corpo: { operadores: [1] } });
        expect(r.status).toBe(403);
      }
    });

    it("diretoria só olha: não registra ligação", async () => {
      const r = await req("POST", "/api/revisoes/1/tentativas", { cookie: sessao.diretoria, corpo: {} });
      expect(r.status).toBe(403);
    });

    it("rota que não existe dá 404 (para quem está logado)", async () => {
      expect((await req("GET", "/api/nao-existe", { cookie: sessao.gestor })).status).toBe(404);
    });
  });

  describe("carteira da operadora", () => {
    it("a fila e a agenda da operadora só têm revisões dela", async () => {
      const eu = (await req("GET", "/api/auth/eu", { cookie: sessao.operadoraB })).corpo;
      // Mesmo pedindo outra operadora no filtro, a API força a carteira dela
      const fila = await req<{ itens: ItemFila[] }>("GET", "/api/revisoes?operador=sem&porPagina=100", {
        cookie: sessao.operadoraB,
      });
      expect(fila.status).toBe(200);
      expect(fila.corpo.itens.length).toBeGreaterThan(0);
      for (const item of fila.corpo.itens) expect(item.operador?.id).toBe(eu.id);

      const agenda = await req("GET", "/api/revisoes/agenda", { cookie: sessao.operadoraB });
      expect(agenda.status).toBe(200);
      for (const secao of Object.values(agenda.corpo.secoes) as { itens: ItemFila[] }[]) {
        for (const item of secao.itens) expect(item.operador?.id).toBe(eu.id);
      }
    });

    it("revisão de outra operadora não abre (404) e não aceita ligação", async () => {
      const eu = (await req("GET", "/api/auth/eu", { cookie: sessao.operadoraA })).corpo;
      const todas = await req<{ itens: ItemFila[] }>("GET", "/api/revisoes?porPagina=100", { cookie: sessao.admin });
      const deOutra = todas.corpo.itens.find((r) => r.operador && r.operador.id !== eu.id)!;
      expect(deOutra).toBeDefined();
      expect((await req("GET", `/api/revisoes/${deOutra.id}`, { cookie: sessao.operadoraA })).status).toBe(404);
      const ligacao = await req("POST", `/api/revisoes/${deOutra.id}/tentativas`, {
        cookie: sessao.operadoraA,
        corpo: { versao: deOutra.versao, conseguiuFalar: false, resultado: "RETORNAR", motivoId: 1 },
      });
      expect(ligacao.status).toBe(404);
    });
  });

  describe("registrar ligação", () => {
    /** Uma revisão aberta da operadora A e o id do motivo "Retornar depois". */
    let revisao: ItemFila;
    let motivoRetornar: number;
    const amanha = somarDias(hoje(), 1);

    beforeAll(async () => {
      const fila = await req<{ itens: ItemFila[] }>("GET", "/api/revisoes?situacao=PENDENTE", {
        cookie: sessao.operadoraA,
      });
      revisao = fila.corpo.itens[0];
      const motivos = await req<{ id: number; descricao: string }[]>("GET", "/api/motivos", {
        cookie: sessao.operadoraA,
      });
      motivoRetornar = motivos.corpo.find((m) => m.descricao === "Retornar depois")!.id;
    });

    it("validação: agendar sem data dá 400 e diz o campo", async () => {
      const r = await req("POST", `/api/revisoes/${revisao.id}/tentativas`, {
        cookie: sessao.operadoraA,
        corpo: { versao: revisao.versao, conseguiuFalar: true, resultado: "SIM" },
      });
      expect(r.status).toBe(400);
      expect(r.corpo.detalhes.campos).toHaveProperty("dataAgendada");
    });

    it("grava a ligação, muda a situação e entra no histórico", async () => {
      const r = await req("POST", `/api/revisoes/${revisao.id}/tentativas`, {
        cookie: sessao.operadoraA,
        corpo: {
          versao: revisao.versao,
          conseguiuFalar: true,
          resultado: "RETORNAR",
          motivoId: motivoRetornar,
          proximoContato: amanha,
          observacoes: "Pediu para ligar amanhã (teste automático)",
        },
      });
      expect(r.status).toBe(201);

      const detalhe = await req("GET", `/api/revisoes/${revisao.id}`, { cookie: sessao.operadoraA });
      expect(detalhe.corpo.situacao).toBe("RETORNAR");
      expect(detalhe.corpo.versao).toBe(revisao.versao + 1);
      expect(detalhe.corpo.tentativas).toHaveLength(1);
      expect(detalhe.corpo).not.toHaveProperty("cpfCnpj");
    });

    it("tela desatualizada (versão antiga) não sobrescreve: 409", async () => {
      const r = await req("POST", `/api/revisoes/${revisao.id}/tentativas`, {
        cookie: sessao.operadoraA,
        corpo: {
          versao: revisao.versao,
          conseguiuFalar: false,
          resultado: "RETORNAR",
          motivoId: motivoRetornar,
          proximoContato: amanha,
        },
      });
      expect(r.status).toBe(409);
    });

    it("a ligação fica na auditoria", async () => {
      const r = await req("GET", "/api/auditoria", { cookie: sessao.admin });
      expect(r.status).toBe(200);
      expect(JSON.stringify(r.corpo)).toContain("TENTATIVA_REGISTRADA");
    });
  });

  describe("exportação", () => {
    it("CSV da fila sai sem CPF", async () => {
      const r = await req<string>("GET", "/api/revisoes/exportar", { cookie: sessao.gestor });
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toMatch(/text\/csv/);
      const cabecalho = r.corpo.split(/\r?\n/)[0];
      expect(cabecalho).toContain("Chassi");
      expect(cabecalho).not.toMatch(/CPF/i);
    });
  });
  describe("LGPD", () => {
    /** Ações registradas na auditoria até agora (página grande o bastante para o banco de testes). */
    async function acoesAuditadas(): Promise<string[]> {
      const r = await req<{ itens: { acao: string }[] }>("GET", "/api/auditoria?porPagina=100", {
        cookie: sessao.admin,
      });
      return r.corpo.itens.map((i) => i.acao);
    }

    it("abrir a tela do cliente e exportar a fila ficam na auditoria", async () => {
      const acoes = await acoesAuditadas();
      expect(acoes).toContain("CLIENTE_VISUALIZADO");
      expect(acoes).toContain("FILA_EXPORTADA");
    });

    it("só o Admin acessa a Privacidade", async () => {
      for (const quem of ["operadoraA", "gestor", "diretoria"] as const) {
        const r = await req("GET", "/api/privacidade/titulares?busca=CLIENTE", { cookie: sessao[quem] });
        expect(r.status).toBe(403);
      }
    });

    it("busca por CPF devolve o documento mascarado", async () => {
      const r = await req("GET", "/api/privacidade/titulares?busca=000.000.000-01", { cookie: sessao.admin });
      expect(r.status).toBe(200);
      expect(r.corpo).toHaveLength(1);
      expect(r.corpo[0].documento).toBe("***.000.000-**");
      expect(r.corpo[0]).not.toHaveProperty("cpfCnpj");
    });

    it("anonimiza: pede confirmação, apaga dados pessoais e tira da fila", async () => {
      // Cliente da revisão que recebeu a ligação com observação (bloco "registrar ligação")
      const fila = await req<{ itens: ItemFila[] }>("GET", "/api/revisoes?situacao=RETORNAR&porPagina=100", {
        cookie: sessao.operadoraA,
      });
      const clienteId = fila.corpo.itens[0].veiculo.cliente.id;

      const sem = await req("POST", `/api/privacidade/titulares/${clienteId}/anonimizar`, {
        cookie: sessao.admin,
        corpo: {},
      });
      expect(sem.status).toBe(400);

      const ok = await req("POST", `/api/privacidade/titulares/${clienteId}/anonimizar`, {
        cookie: sessao.admin,
        corpo: { confirmacao: "ANONIMIZAR" },
      });
      expect(ok.status).toBe(200);
      expect(ok.corpo.revisoesEncerradas).toBeGreaterThanOrEqual(1);

      const dados = await req("GET", `/api/privacidade/titulares/${clienteId}`, { cookie: sessao.admin });
      expect(dados.corpo.nome).toBe(`CLIENTE ANONIMIZADO ${clienteId}`);
      expect(dados.corpo.cpfCnpj).toBeNull();
      expect(dados.corpo.celular).toBeNull();
      const revisoes = dados.corpo.veiculos.flatMap((v: { revisoes: unknown[] }) => v.revisoes);
      for (const r of revisoes) {
        expect(["PENDENTE", "RETORNAR", "AGENDADO", "BUSCAR_CONTATO"]).not.toContain(r.situacao);
        for (const t of r.tentativas) expect(t.observacoes).toBeNull();
      }

      const deNovo = await req("POST", `/api/privacidade/titulares/${clienteId}/anonimizar`, {
        cookie: sessao.admin,
        corpo: { confirmacao: "ANONIMIZAR" },
      });
      expect(deNovo.status).toBe(409);
      expect(await acoesAuditadas()).toEqual(
        expect.arrayContaining(["DADOS_TITULAR_CONSULTADOS", "CLIENTE_ANONIMIZADO"]),
      );
    });

    it("prazo de guarda: só entra quem não tem revisão aberta e está parado há mais tempo", async () => {
      const { prisma } = await import("../db/prisma.js");
      const { clientesForaDoPrazo } = await import("../services/privacidade.js");
      // Um cliente com revisão encerrada, "parado" há 3 anos
      const parado = await prisma.revisaoAlvo.findFirstOrThrow({
        where: { situacao: "NAO_AGENDADO", veiculo: { cliente: { anonimizadoEm: null } } },
        select: { veiculo: { select: { clienteId: true } } },
      });
      const clienteId = parado.veiculo.clienteId;
      const antigo = new Date(Date.now() - 3 * 365 * 24 * 3600 * 1000);
      await prisma.$executeRaw`UPDATE clientes SET atualizado_em = ${antigo} WHERE id = ${clienteId}`;
      await prisma.$executeRaw`UPDATE revisoes_alvo SET atualizado_em = ${antigo}
        WHERE veiculo_id IN (SELECT id FROM veiculos WHERE cliente_id = ${clienteId})`;
      await prisma.$executeRaw`UPDATE tentativas_contato SET criado_em = ${antigo}
        WHERE revisao_id IN (SELECT r.id FROM revisoes_alvo r JOIN veiculos v ON v.id = r.veiculo_id WHERE v.cliente_id = ${clienteId})`;

      expect((await clientesForaDoPrazo(24)).map((c) => c.id)).toContain(clienteId);
      expect((await clientesForaDoPrazo(48)).map((c) => c.id)).not.toContain(clienteId);
      // Clientes com revisão aberta nunca entram, mesmo com prazo curto
      const comAberta = await prisma.revisaoAlvo.findFirstOrThrow({
        where: { situacao: "PENDENTE" },
        select: { veiculo: { select: { clienteId: true } } },
      });
      expect((await clientesForaDoPrazo(12)).map((c) => c.id)).not.toContain(comAberta.veiculo.clienteId);
    });
  });
});
