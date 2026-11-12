# Roteiro de desenvolvimento

Checklist para construir o sistema **aos poucos**. Cada etapa termina com algo funcionando que você consegue testar antes de seguir para a próxima. Marque `[x]` conforme for concluindo.

**Stack:** TypeScript · React (Vite) · Bootstrap + Sass · Node.js + Express · PostgreSQL · Python só se for necessário (ver etapa 6).

---

## Etapa 0 — Preparar o ambiente
- [ ] Instalar **Node.js 20 LTS** ou superior e conferir com `node -v` e `npm -v`
- [ ] Instalar o **VS Code** com as extensões ESLint, Prettier e "Sass"
- [ ] Instalar o **PostgreSQL** (local ou Docker) ou criar um projeto no **Supabase**
- [ ] Instalar um cliente de banco (DBeaver, pgAdmin ou a extensão do VS Code)
- [ ] Configurar o Git: `git config --global user.name` e `user.email`

**Pronto quando:** `node -v` e `psql --version` (ou o painel do Supabase) funcionam.

---

## Etapa 1 — Estrutura do repositório
- [x] Criar as pastas `apps/web` e `apps/api` (`docs/` já existe)
- [x] Renomear `APRESENTAÇÃO` para `.pptx` e movê-la para `docs/`
- [x] `.gitignore` criado, já ignorando `Documentos/`, `*.xlsx` e `*.csv` (planilhas reais têm CPF e telefone)
- [x] Conferir com `git status` que **nada de `Documentos/` aparece**
- [x] Primeiro commit e push: `README.md`, `ROTEIRO.md`, `.gitignore` e `docs/`

**Pronto quando:** o repositório aparece organizado no GitHub.

---

## Etapa 2 — Backend "Olá mundo" (Express + TypeScript)
Dentro de `apps/api`:
- [x] `npm init -y`
- [x] `npm i express cors dotenv` (Express 5)
- [x] `npm i -D typescript tsx @types/node @types/express @types/cors`
- [x] `tsconfig.json` (ESM / NodeNext, `src` → `dist`)
- [x] `src/app.ts` (app Express, CORS, 404 e erros), `src/server.ts` (sobe o servidor), `src/config.ts` (lê o `.env`)
- [x] Rota `GET /api/health` em `src/routes/health.ts`
- [x] Scripts: `dev`, `build`, `start`, `typecheck`
- [x] `.env` (fora do Git) e `.env.example`

**Pronto quando:** `npm run dev` roda e o navegador mostra `{ "ok": true }` em `http://localhost:3333/api/health`.

---

## Etapa 3 — Frontend "Olá mundo" (React + Bootstrap + Sass)
Dentro de `apps/`:
- [x] `npm create vite@latest web -- --template react-ts` (React 19 + Vite 8)
- [x] Em `apps/web`: `npm i bootstrap bootstrap-icons react-router-dom` e `npm i -D sass`
- [x] Tema em `src/styles/`: `_variables.scss` (cores da marca e fonte Montserrat) → Bootstrap → `_layout.scss`
- [x] Importar `main.scss` no `main.tsx`
- [x] **Layout base** (`components/Layout.tsx`): menu lateral escuro, barra superior com faixa vermelha e menu recolhível no celular
- [x] Páginas: Dashboard, Fila de revisões, Atendimentos, Importações, Usuários e 404
- [x] Proxy `/api` → `http://localhost:3333` no `vite.config.ts`
- [x] Dashboard chama `/api/health` e mostra "API ok" (ou o aviso de API fora do ar)

**Pronto quando:** você navega entre as páginas e o Dashboard mostra "API ok".

---

## Etapa 4 — Banco de dados
- [x] PostgreSQL 18 instalado localmente (Windows, porta 5432)
- [x] Script `scripts/setup-db-local.ps1` (`npm run db:setup`): cria o usuário `pos_venda` e o banco `gestao_pos_venda`, e grava `DATABASE_URL` no `.env`
- [x] **Prisma 7.10.1** com `@prisma/adapter-pg` + `pg`; configuração em `prisma.config.ts`
- [x] `prisma/schema.prisma` com as 8 tabelas: `unidades`, `usuarios`, `motivos`, `importacoes`, `clientes`, `veiculos` (chassi único), `ordens_servico`, `revisoes_alvo`
- [x] Migração inicial `prisma/migrations/..._inicial` (`npm run db:migrate`)
- [x] *Seed* (`npm run db:seed`, idempotente): 3 unidades, 11 motivos, 4 usuários e 20 clientes/motos/revisões **fictícios**
- [x] Conexão única em `src/db/prisma.ts`; `DATABASE_URL` obrigatória em `config.ts`
- [x] Rota `GET /api/revisoes` (rota → serviço → banco), com paginação e sem CPF na resposta

**Pronto quando:** a rota devolve as revisões fictícias em JSON.

---

## Etapa 5 — Validar as regras com a equipe (sem código)
- [x] Receber exemplos dos relatórios do Cloud (lista de revisões, espelhamento de OS, acompanhamento, produção)
- [x] Documentar colunas e lógica em [docs/regras-de-negocio.md](docs/regras-de-negocio.md)
- [x] Chave de cruzamento identificada: **chassi**
- [ ] Responder as [perguntas em aberto](docs/regras-de-negocio.md#7-perguntas-para-a-equipe), principalmente: o tipo de OS precisa bater com o KM? Qual é o período do espelhamento?
- [ ] Criar em `db/seed/` versões **fictícias** dos dois arquivos de entrada, com as mesmas colunas, para os testes

**Pronto quando:** as perguntas em aberto estão respondidas e os arquivos fictícios de teste existem.

---

## Etapa 6 — Importação (o coração do sistema)
Backend:
- [ ] Upload de arquivos com `multer`
- [ ] Ler CSV com `csv-parse` e XLSX com `exceljs`
- [ ] Reconhecer as colunas da **lista de revisões** (Pessoa, CPF/CNPJ, Data Venda, Chassi, Modelo, Km, Cor, Celular, Município) e do **espelhamento** (Chassi, Tipo O.S., Código Assistência Técnica)
- [ ] Normalizar: chassi (sem espaços, maiúsculo, 17 caracteres), município (sem `/MA`), CPF e celular
- [ ] Validar cada linha (`zod`): campos obrigatórios, chassi válido, km entre 1000, 6000, 12000 e 18000
- [ ] Separar os registros em **válidos**, **duplicados** (mesmo chassi + km) e **inconsistentes**
- [ ] Cruzar por **chassi**: quem tem OS no espelhamento sai, o resto é **elegível**
- [ ] Escrever um teste (`vitest`) da regra de cruzamento com os arquivos fictícios
- [ ] Gravar em duas fases: **prévia** (rascunho) e depois **confirmação**
- [ ] Registrar cada importação na tabela `importacoes`

Frontend:
- [ ] Tela em 4 passos: Arquivos → Validação → Cruzamento → Confirmação
- [ ] Cards com os totais e uma tabela de prévia
- [ ] Histórico de importações

> **Quando usar Python:** só se os relatórios do Cloud vierem muito bagunçados (cabeçalhos em várias linhas, células mescladas, encoding estranho) e ficar difícil tratar em Node. Nesse caso, crie `apps/importer` com um script em **pandas** que limpa o arquivo e devolve um CSV padronizado para a API. Comece sem Python.

**Pronto quando:** você importa os dois arquivos de teste e vê os números de elegíveis corretos.

---

## Etapa 7 — Fila de revisões (carteira)
- [ ] Gerar `revisoes_alvo` (um registro por chassi + km) a partir dos elegíveis de uma importação confirmada. *Depende da Etapa 6 (importação).*
- [ ] Definir a unidade (STI, ZDC ou BRT) conforme a regra validada na etapa 5. *Depende das respostas da equipe (Etapa 5).*
- [x] Rota de listagem com busca (nome, chassi, celular), filtros (unidade, operadora ou "sem operadora", km, situação, mês de venda) e paginação, validada com `zod`
- [x] Tela com tabela Bootstrap, filtros guardados na URL e *badges* coloridos por situação
- [x] Distribuir clientes entre colaboradores: atribuir em lote (`PATCH /api/revisoes/atribuir`) e dividir em partes iguais (`POST /api/revisoes/distribuir`)
- [x] Botão **Exportar** (CSV para Excel: `;`, acentos e sem CPF)

> Os dois itens abertos são feitos junto com a Etapa 6, quando a fila passar a nascer da importação. Até lá, a fila usa os dados fictícios do seed.

**Pronto quando:** a carteira aparece filtrável e dá para atribuir responsáveis.

---

## Etapa 8 — Atendimentos
- [x] Tabela `tentativas_contato` (cada ligação vira uma tentativa, não uma linha nova)
- [x] Tela do cliente (`/revisoes/:id`): dados do cliente e da moto, atalhos para ligar e WhatsApp, linha do tempo das tentativas
- [x] Formulário igual ao da planilha: **Conseguiu falar?** (sim/não), **Agendou?** (sim/não/retornar), **Motivo**, **Data agendada**, **Próximo contato**, Observações
- [x] Validação condicional: motivo obrigatório se *não* ou *retornar*; data agendada obrigatória se *sim*; próximo contato obrigatório quando a revisão volta para a fila; só agenda quem falou com o cliente
- [x] Atualizar a situação da revisão (`agendado`, `retornar`, `nao_agendado`, `buscar_contato`), conforme a **ação do motivo** (`motivos.acao`)
- [x] Marcar a revisão como **concluída** à mão (e reabrir)
- [ ] Concluir automaticamente pelo espelhamento do mês seguinte. *Depende da Etapa 6 (importação).*
- [x] **Proteção contra sobrescrita:** gravar só se a `versao` não mudou; se mudou, responder 409, avisar o usuário e oferecer "Recarregar" sem perder o que foi digitado

> Testado em duas abas: a segunda gravação é bloqueada com aviso, e o contato da primeira aparece depois de recarregar.

**Pronto quando:** em duas abas ao mesmo tempo, a segunda gravação é bloqueada com aviso em vez de apagar a primeira.

---

## Etapa 9 — Login e permissões
- [x] Senhas com `bcrypt` e login gerando token **JWT**, guardado em cookie `httpOnly` + `SameSite=Strict`
- [x] Middleware no Express que exige login (401) e confere o perfil (403)
- [x] Perfis: Operadora (o "colaborador" da planilha), Gestor, Diretoria, Admin
- [x] Operadora vê só a própria carteira (a API força o filtro; revisão de outra pessoa responde 404)
- [x] Tela de Usuários (só Admin): criar com senha provisória, editar, redefinir senha, desativar (nunca apagar)
- [x] Senha provisória obrigatoriamente trocada no primeiro login; trocar a senha encerra os outros logins
- [x] Limite de tentativas: 5 erros seguidos bloqueiam o e-mail por 15 minutos
- [x] Tabela `auditoria`: quem alterou o quê e quando (login, contatos, conclusão, atribuição, distribuição, usuários)
- [x] O autor de cada contato passa a ser quem está logado

> Testado com os quatro perfis na API (58 verificações) e no navegador: menus, botões e páginas mudam por perfil, sessão vencida volta para o login com aviso.

> Se usar Supabase, avalie o **Supabase Auth** em vez de fazer o login do zero.

**Pronto quando:** cada perfil vê só o que pode, e as alterações ficam registradas.

---

## Etapa 10 — Dashboard
Reproduzir o relatório mensal de produção que hoje é feito à mão:
- [ ] Tabela **operadora × unidade**: total de clientes, conseguiu falar, não conseguiu, agendados, concluídos
- [ ] Rankings: % contato (falou ÷ total), % agendamento (agendados ÷ falou), % conclusão (concluídos ÷ agendados)
- [ ] % concluídos da base por unidade
- [ ] Causas de "falou e não agendou" por operadora × unidade, com %
- [ ] Gráficos com `react-chartjs-2` (ou Recharts) e filtros por mês, unidade e operadora
- [ ] Exportar o relatório em Excel

**Pronto quando:** o relatório de um mês fictício bate com o cálculo feito à mão.

---

## Etapa 11 — Qualidade e publicação
- [ ] Testes da regra de cruzamento (`vitest`), a parte mais crítica
- [ ] ESLint e Prettier nos dois apps
- [ ] Rotina de backup do banco e teste de restauração
- [ ] Hospedagem (validar com a TI): por exemplo Render ou Railway para a API e Vercel ou Netlify para o frontend
- [ ] Piloto com a oficina e coleta de feedback

---

## Dicas para ir aos poucos
- **Um commit por item concluído**, com mensagem clara (`feat: rota de health`).
- Faça uma etapa de cada vez e só avance quando o "Pronto quando" funcionar.
- Use sempre **dados fictícios** no desenvolvimento.
- Se travar em algum item, peça ajuda citando a etapa (ex.: "Etapa 6, ler XLSX").
- **Documente e comente tudo:** cabeçalho em todo arquivo, JSDoc nas funções e tipos, e atualize o [docs/arquitetura.md](docs/arquitetura.md) ao fim de cada etapa.
