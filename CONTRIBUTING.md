# Guia de contribuição

Como contribuir com o **Sistema de Gestão do Pós-Venda — Maranhão Motos**. Estes padrões valem para qualquer pessoa que mexer no projeto, inclusive para revisões feitas com ajuda de IA.

> Antes de começar, leia o [README.md](README.md) (como rodar), o [docs/arquitetura.md](docs/arquitetura.md) (como o código está organizado) e o [docs/regras-de-negocio.md](docs/regras-de-negocio.md) (como a operação funciona).

---

## 1. Preparar o ambiente

```bash
git clone https://github.com/BergeS7/gestao-pos-venda.git
cd gestao-pos-venda
npm install
cp apps/api/.env.example apps/api/.env
npm run db:setup
npm run db:migrate
npm run db:seed
npm run dev
```

> **Windows:** se o PowerShell bloquear o `npm`, veja a nota no README, seção 5.

### Configurar o Git para a contribuição contar no GitHub
O GitHub só mostra um commit no seu perfil (quadradinhos verdes) se o **e-mail do commit** estiver cadastrado na sua conta. Use o e-mail privado que o GitHub oferece em *Settings → Emails* (formato `ID+usuario@users.noreply.github.com`):

```bash
git config user.name "SeuUsuarioGitHub"
git config user.email "ID+SeuUsuarioGitHub@users.noreply.github.com"
```

---

## 2. Fluxo de trabalho

1. **Escolha um item do [ROTEIRO.md](ROTEIRO.md)**. Trabalhe uma etapa ou um item de cada vez.
2. **Atualize sua cópia** antes de começar: `git pull`.
3. **Faça a alteração** seguindo os padrões abaixo.
4. **Confira** com `npm run check` na raiz. Precisa terminar sem erros.
5. **Atualize a documentação** junto com o código (seção 5).
6. **Commit** com mensagem no padrão (seção 4).
7. **Envie** com `git push`.

> Com mais pessoas no projeto, o ideal passa a ser trabalhar em uma *branch* (`git switch -c feat/importacao`) e abrir um *Pull Request* para revisão antes de juntar na `main`.

---

## 3. Padrões de código

### Comentários: documente e comente tudo
- **Todo arquivo começa com um cabeçalho** dizendo *o que é* e *por que existe*.
- **Funções, tipos e componentes exportados** têm comentário JSDoc (`/** ... */`), explicando parâmetros, retorno e erros.
- **Decisões não óbvias** são explicadas no ponto onde acontecem: por que foi feito assim e o que evitar.
- Comentários e documentação em **português**.

```ts
/**
 * Lista as revisões da fila, com veículo, cliente, unidade e operadora.
 *
 * @param pagina Página desejada, começando em 1.
 * @returns os itens da página e o total geral
 */
export async function listarRevisoes(...) { ... }
```

### Organização
| Onde | O que vai |
|---|---|
| `apps/api/src/routes/` | Só HTTP: ler e validar a requisição, chamar o serviço, responder |
| `apps/api/src/services/` | Regras de negócio e consultas ao banco |
| `apps/api/src/db/` | Conexão com o banco |
| `apps/api/prisma/` | Schema, migrações e seed |
| `apps/web/src/pages/` | Uma página por arquivo |
| `apps/web/src/components/` | Peças reutilizáveis |
| `apps/web/src/lib/api.ts` | Todas as chamadas do frontend à API |
| `apps/web/src/styles/` | Tema e estilos. **Cores só via variáveis Sass** |

### Nomes
- Domínio do negócio em **português** (`revisoes`, `importacoes`, `listarRevisoes`).
- Componentes React em `PascalCase.tsx`; demais arquivos em `camelCase.ts`; parciais Sass com `_`.
- Tabelas e colunas do banco em `snake_case`, via `@@map`/`@map` no Prisma.

### Banco de dados
- **Toda mudança de tabela** é feita no `schema.prisma` e vira uma migração: `npm run db:migrate -- --name descricao`. Nunca altere o banco "na mão".
- As migrações (`prisma/migrations/`) **vão para o Git**.
- O seed precisa continuar **idempotente** (usar `upsert`).

---

## 4. Mensagens de commit

Formato: `tipo(escopo): descrição curta no imperativo`

| Tipo | Quando usar |
|---|---|
| `feat` | Funcionalidade nova |
| `fix` | Correção de erro |
| `refactor` | Melhoria de código sem mudar o comportamento |
| `docs` | Só documentação |
| `chore` | Configuração, dependências, scripts |
| `test` | Testes |

Escopos comuns: `api`, `web`, `db`, `docs`.

Exemplos:
```
feat(api): rota de importação do espelhamento de OS
fix(web): menu não fechava ao trocar de página no celular
docs(regras): respostas da equipe sobre o período do espelhamento
```

Um commit por item concluído, com o corpo explicando **o que** mudou e **por quê**, quando não for óbvio.

---

## 5. Documentação junto com o código

Ao terminar uma alteração, atualize o que for afetado:

| Mudou… | Atualize |
|---|---|
| Como rodar, scripts, rotas da API | [README.md](README.md) |
| Pastas, camadas, decisões técnicas | [docs/arquitetura.md](docs/arquitetura.md) |
| Regras da operação (respostas da equipe) | [docs/regras-de-negocio.md](docs/regras-de-negocio.md) |
| Item concluído | Marque `[x]` no [ROTEIRO.md](ROTEIRO.md) |
| Variável de ambiente nova | `apps/api/.env.example`, comentada |

---

## 6. ⚠️ Dados e segurança (obrigatório)

- **Nunca** versione dados reais de clientes (nome, CPF, telefone, chassi real). As planilhas da operação ficam em `Documentos/`, que é ignorada pelo Git.
- Seeds, testes e exemplos usam **somente dados fictícios** (ex.: `CLIENTE EXEMPLO 01`, chassi `9C2TST...`).
- **Senhas e chaves só no `.env`**, que nunca vai para o Git. Confira com `git status` antes de cada commit.
- A API não devolve dados sensíveis sem necessidade (ex.: a listagem não expõe CPF).
- Erros para o usuário são genéricos; o detalhe fica só no log do servidor.

---

## 7. Checklist antes do commit

- [ ] `npm run check` passou (tipos, lint e build)
- [ ] Testei a alteração rodando o sistema (`npm run dev`)
- [ ] Arquivos novos têm cabeçalho; funções exportadas têm JSDoc
- [ ] Documentação atualizada (seção 5)
- [ ] Nenhum dado real, senha ou `.env` no `git status`
- [ ] Mensagem de commit no padrão
