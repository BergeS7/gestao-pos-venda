/**
 * config.ts — Configurações da API
 *
 * Centraliza tudo o que vem de variáveis de ambiente (arquivo `.env`).
 * O resto do código importa `config` daqui em vez de ler `process.env`
 * diretamente. Assim:
 *  - existe um único lugar para ver quais configurações a API usa;
 *  - os valores padrão ficam documentados;
 *  - os tipos já chegam convertidos (ex.: a porta como número).
 *
 * Para mudar um valor localmente, edite `apps/api/.env`.
 * O modelo com todas as variáveis está em `apps/api/.env.example`.
 */

// Carrega o arquivo .env para dentro de process.env.
// Precisa rodar antes de qualquer leitura de process.env abaixo.
import "dotenv/config";

/** Configurações tipadas da aplicação. */
export const config = {
  /** Porta HTTP em que a API escuta. Padrão: 3333. */
  port: Number(process.env.PORT ?? 3333),

  /**
   * Endereço do frontend autorizado a chamar a API (CORS).
   * Padrão: o servidor de desenvolvimento do Vite (porta 5173).
   */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  /** Ambiente de execução: "development" ou "production". */
  nodeEnv: process.env.NODE_ENV ?? "development",

  /**
   * URL de conexão com o PostgreSQL. Obrigatória: sem ela a API não sobe.
   * Localmente é criada por scripts/setup-db-local.ps1.
   */
  databaseUrl: obrigatoria("DATABASE_URL"),

  /**
   * Chave secreta que assina os tokens de login (JWT), Etapa 9. Obrigatória.
   * Precisa ser longa e aleatória (32+ caracteres) e NUNCA ir para o Git:
   * quem conhece esta chave consegue se passar por qualquer usuário.
   * Trocar a chave desconecta todo mundo (os tokens antigos deixam de valer).
   */
  jwtSecret: chaveSecreta("JWT_SECRET"),

  /** Tempo de validade do login, em horas. Padrão: 10 (um turno de trabalho com folga). */
  sessaoHoras: Number(process.env.SESSAO_HORAS ?? 10),
};

/** Lê uma chave secreta obrigatória e recusa chaves curtas demais (fáceis de adivinhar). */
function chaveSecreta(nome: string): string {
  const valor = obrigatoria(nome);
  if (valor.length < 32) {
    throw new Error(`${nome} precisa ter pelo menos 32 caracteres. Gere uma com: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
  }
  return valor;
}

/**
 * Lê uma variável de ambiente obrigatória. Se ela faltar, encerra com uma
 * mensagem clara já na inicialização, em vez de falhar depois, no meio de
 * uma requisição.
 */
function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não definida. Confira o arquivo apps/api/.env (modelo em .env.example).`,
    );
  }
  return valor;
}
