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
- [ ] `npm create vite@latest web -- --template react-ts`
- [ ] Em `apps/web`: `npm i bootstrap react-router-dom` e `npm i -D sass`
- [ ] Criar `src/styles/main.scss` com as cores da marca **antes** de `@import "bootstrap/scss/bootstrap";`: `$primary: #cc0000; $secondary: #5c5c5c; $light: #b2b0b0;`
- [ ] Importar `main.scss` no `main.tsx`
- [ ] Montar o **layout base**: menu lateral escuro (Dashboard, Carteira, Atendimentos, Importações, Usuários) e área de conteúdo
- [ ] Criar uma página vazia para cada item do menu, ligadas com `react-router-dom`
- [ ] No Vite, configurar um proxy de `/api` para `http://localhost:3333`
- [ ] Na página Dashboard, chamar `/api/health` e mostrar o resultado

**Pronto quando:** você navega entre as páginas e o Dashboard mostra "API ok".

---

## Etapa 4 — Banco de dados
- [ ] Escolher como acessar o banco: **Prisma** (recomendado, mais simples) ou `pg` com SQL puro
- [ ] `npm i @prisma/client` e `npm i -D prisma`, depois `npx prisma init`
- [ ] Colocar `DATABASE_URL` no `.env`
- [ ] Modelar as tabelas iniciais (ver README, seção 3): `unidades`, `usuarios`, `clientes`, `veiculos` (chassi único), `importacoes`, `ordens_servico`, `revisoes_alvo`, `motivos`
- [ ] `npx prisma migrate dev` para criar as tabelas
- [ ] *Seed*: as 3 unidades (STI, ZDC, BRT), os 11 motivos da planilha e uns 20 clientes/veículos **fictícios**
- [ ] Rota `GET /api/revisoes` listando do banco

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
- [ ] Gerar `revisoes_alvo` (um registro por chassi + km) a partir dos elegíveis de uma importação confirmada
- [ ] Definir a unidade (STI, ZDC ou BRT) conforme a regra validada na etapa 5
- [ ] Rota de listagem com busca, filtros (unidade, operadora, km, situação, mês de venda) e paginação
- [ ] Tela com tabela Bootstrap, filtros e *badges* coloridos por situação
- [ ] Distribuir clientes entre colaboradores (atribuir responsável)
- [ ] Botão **Exportar** (gera CSV ou XLSX)

**Pronto quando:** a carteira aparece filtrável e dá para atribuir responsáveis.

---

## Etapa 8 — Atendimentos
- [ ] Tabela `tentativas_contato` (cada ligação vira uma tentativa, não uma linha nova)
- [ ] Tela do cliente: dados do veículo e linha do tempo das tentativas
- [ ] Formulário igual ao da planilha: **Conseguiu falar?** (sim/não), **Agendou?** (sim/não/retornar), **Motivo**, **Data agendada**, **Próximo contato**, Observações
- [ ] Validação condicional: motivo obrigatório se *não* ou *retornar*; data agendada obrigatória se *sim*
- [ ] Atualizar a situação da revisão (`agendado`, `retornar`, `nao_agendado`, `buscar_contato`)
- [ ] Marcar a revisão como **concluída**, primeiro à mão e depois pelo espelhamento do mês seguinte
- [ ] **Proteção contra sobrescrita:** gravar só se a `versao` não mudou; se mudou, avisar o usuário

**Pronto quando:** em duas abas ao mesmo tempo, a segunda gravação é bloqueada com aviso em vez de apagar a primeira.

---

## Etapa 9 — Login e permissões
- [ ] Senhas com `bcrypt` e login gerando token **JWT** (ou sessão em cookie `httpOnly`)
- [ ] Middleware no Express que exige login e confere o perfil
- [ ] Perfis: Colaborador, Gestor, Diretoria, Admin
- [ ] Colaborador vê só a própria carteira
- [ ] Tela de Usuários (só Admin)
- [ ] Tabela `auditoria`: quem alterou o quê e quando

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
