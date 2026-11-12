# Arquitetura do sistema

Como o sistema está organizado **hoje** (Etapas 1 a 4 do [ROTEIRO.md](../ROTEIRO.md)) e para onde ele vai. **Atualize este documento a cada etapa concluída.**

> **Arquitetura cliente-servidor em 3 camadas (*three-tier*): SPA em React + API REST em Node.js/Express + banco PostgreSQL, organizada em monorepo.**

| Conceito | Onde aparece no projeto |
|---|---|
| **Cliente-servidor** | O navegador (cliente) pede dados e a API (servidor) responde |
| **3 camadas (*three-tier*)** | **Apresentação** (React) → **Aplicação/regras** (Express) → **Dados** (PostgreSQL) |
| **SPA (*Single Page Application*)** | O frontend carrega uma vez e troca de página sem recarregar (React Router) |
| **API REST** | Endereços como `GET /api/health`, sempre respondendo JSON |
| **Camadas dentro da API** | `routes` (entrada HTTP) → `services` (regras de negócio) → `db` (acesso ao banco) |
| **Monorepo** | Frontend e API no mesmo repositório (`apps/web` e `apps/api`) |

---

## 1. Visão geral

O sistema tem **duas aplicações separadas** dentro do mesmo repositório (estrutura chamada *monorepo*):

| App | Pasta | O que é | Porta (dev) |
|---|---|---|---|
| **Frontend** | `apps/web` | Telas que o usuário vê no navegador (React) | 5173 |
| **API** (backend) | `apps/api` | Servidor que guarda as regras e os dados (Express) | 3333 |
| **Banco de dados** | (serviço do Windows) | PostgreSQL 18, banco `gestao_pos_venda` | 5432 |

```
                 NAVEGADOR
   ┌──────────────────────────────────────┐
   │  Frontend React  (apps/web)          │
   │  http://localhost:5173               │
   │                                      │
   │  fetch("/api/health")                │
   └──────────────────┬───────────────────┘
                      │  1. o navegador pede /api/health ao Vite (5173)
                      ▼
   ┌──────────────────────────────────────┐
   │  Servidor do Vite (proxy)            │  2. o Vite repassa tudo
   │  vite.config.ts → '/api' → :3333     │     que começa com /api
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │  API Express  (apps/api)             │  3. a API processa e
   │  http://localhost:3333               │     responde JSON
   │  rota → serviço → Prisma             │
   └──────────────────┬───────────────────┘
                      │  4. lê e grava pelo Prisma (usuário pos_venda)
                      ▼
   ┌──────────────────────────────────────┐
   │  PostgreSQL 18  (localhost:5432)     │
   │  banco gestao_pos_venda              │
   └──────────────────────────────────────┘
```

**Por que separar frontend e API?**
- **Responsabilidades claras:** a tela só mostra e coleta dados. As regras (cruzamento por chassi, validações, permissões) ficam na API, onde o usuário não consegue burlá-las.
- **Segurança:** o banco de dados só é acessado pela API, nunca direto do navegador.
- **Evolução independente:** dá para trocar a tela ou criar um app de celular sem mexer nas regras.

---

## 2. Estrutura de pastas

```
gestao-pos-venda/
├── apps/
│   ├── api/                      ← BACKEND (Node + Express + TypeScript)
│   │   ├── src/
│   │   │   ├── server.ts         Ponto de entrada: liga o servidor na porta
│   │   │   ├── app.ts            Monta o Express: middlewares, rotas, 404, erros
│   │   │   ├── config.ts         Lê o .env e expõe as configurações tipadas
│   │   │   ├── routes/           CAMADA HTTP: lê a requisição e responde
│   │   │   │   ├── health.ts     GET /api/health
│   │   │   │   ├── revisoes.ts   Fila: listar, exportar, atribuir, distribuir
│   │   │   │   └── catalogos.ts  GET /api/unidades, /operadoras, /motivos
│   │   │   ├── schemas/          VALIDAÇÃO: formato aceito em cada rota (zod)
│   │   │   │   └── revisoes.ts   Filtros, paginação, atribuir e distribuir
│   │   │   ├── services/         CAMADA DE REGRAS: consultas e regras de negócio
│   │   │   │   └── revisoes.ts   Filtros, paginação, atribuição e distribuição
│   │   │   ├── lib/              Utilitários sem regra de negócio
│   │   │   │   ├── erros.ts      ErroHttp: erro com código HTTP
│   │   │   │   ├── validar.ts    Valida com zod e lança 400 com os campos errados
│   │   │   │   ├── csv.ts        Gera CSV para Excel (BOM, ";", anti-fórmula)
│   │   │   │   └── formatar.ts   Datas, celular e situação em texto
│   │   │   ├── db/
│   │   │   │   └── prisma.ts     Conexão única com o banco (PrismaClient)
│   │   │   └── generated/prisma/ Cliente gerado pelo Prisma (NÃO vai pro Git)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     Definição das tabelas
│   │   │   ├── migrations/       Histórico de alterações do banco (SQL versionado)
│   │   │   └── seed.ts           Dados iniciais (unidades, motivos, exemplos fictícios)
│   │   ├── scripts/
│   │   │   └── setup-db-local.ps1  Cria usuário e banco local e grava o .env
│   │   ├── prisma.config.ts      Configuração do Prisma CLI
│   │   ├── .env.example          Modelo das variáveis de ambiente (vai pro Git)
│   │   ├── .env                  Valores reais locais (NÃO vai pro Git)
│   │   ├── tsconfig.json         Configuração do TypeScript
│   │   └── package.json          Dependências e scripts
│   │
│   └── web/                      ← FRONTEND (React + TypeScript + Bootstrap/Sass)
│       ├── index.html            HTML base: fonte Montserrat e <div id="root">
│       ├── vite.config.ts        Porta, proxy /api e opções do Sass
│       ├── public/favicon.svg    Ícone da aba
│       └── src/
│           ├── main.tsx          Ponto de entrada: estilos + roteador + <App/>
│           ├── App.tsx           Mapa de rotas (URL → página)
│           ├── components/       Peças reutilizáveis
│           │   ├── Layout.tsx    Menu lateral + barra superior + área da página
│           │   ├── menu.ts       Lista de itens do menu
│           │   ├── PageHeader.tsx Título padrão das páginas
│           │   ├── EmBreve.tsx   Aviso "em construção"
│           │   ├── BadgeSituacao.tsx Etiqueta colorida da situação
│           │   ├── Paginacao.tsx "1–20 de N" com anterior/próxima
│           │   └── revisoes/     Peças da fila: filtros, tabela, painel Distribuir
│           ├── hooks/
│           │   └── useDebounce.ts Espera parar de digitar antes de buscar
│           ├── pages/            Uma página por arquivo (Dashboard, Importações…)
│           ├── lib/
│           │   ├── api.ts        Funções para chamar a API + tipos das respostas
│           │   └── formatar.ts   Datas, celular, km, plural e cores das situações
│           └── styles/
│               ├── main.scss     Junta tudo, na ordem certa
│               ├── _variables.scss  Cores e fontes da marca (tema do Bootstrap)
│               └── _layout.scss  Estilos próprios (menu, topo, cards)
│
├── docs/                         Documentação
│   ├── arquitetura.md            (este arquivo)
│   ├── regras-de-negocio.md      Lógica extraída das planilhas reais
│   ├── paleta-de-cores.txt
│   └── apresentacao-proposta.pptx
├── Documentos/                   Planilhas REAIS (ignorada pelo Git, tem CPF/telefone)
├── .vscode/                      Configuração do VS Code: terminal cmd, tarefas e extensões
├── package.json                  Scripts da raiz: "npm run dev" sobe API + web juntos (concurrently)
├── README.md                     Visão geral e como rodar
├── CONTRIBUTING.md               Guia de contribuição (padrões, commits, segurança)
├── ROTEIRO.md                    Checklist de desenvolvimento por etapas
└── .gitignore                    O que nunca vai para o GitHub
```

---

## 3. Backend: `apps/api`

### Tecnologias
| Pacote | Para quê |
|---|---|
| `express` (v5) | Framework HTTP: recebe requisições e devolve respostas |
| `cors` | Libera o frontend (outra porta) para chamar a API |
| `dotenv` | Carrega o arquivo `.env` em `process.env` |
| `typescript` | Tipagem estática: pega erros antes de rodar |
| `tsx` | Roda TypeScript direto em desenvolvimento, com reinício automático |
| `prisma` / `@prisma/client` (v7) | ORM: define as tabelas em `schema.prisma`, gera migrações SQL e um cliente TypeScript tipado |
| `@prisma/adapter-pg` + `pg` | Driver que conecta o Prisma 7 ao PostgreSQL |

### Caminho de uma requisição
```
GET /api/revisoes?pagina=1&porPagina=20
   │
   ▼
server.ts  ── app.listen(3333)
   │
   ▼
app.ts
   ├─ cors()            libera a origem http://localhost:5173
   ├─ express.json()    lê corpo JSON (PATCH/POST); JSON malformado → 400
   ├─ /api/health   ──► routes/health.ts  ──► 200 { ok: true }
   ├─ /api/revisoes ──► routes/revisoes.ts
   │                      ├─► lib/validar.ts + schemas/revisoes.ts  (zod; inválido → 400)
   │                      └─► services/revisoes.ts   (monta o filtro e a consulta)
   │                            └─► db/prisma.ts ──► PostgreSQL
   │                      ◄── 200 { itens, total, pagina, ... }
   ├─ /api/unidades, /operadoras, /motivos ──► routes/catalogos.ts
   ├─ 404               (só chega aqui se nenhuma rota respondeu)
   └─ tratador de erro  ErroHttp → seu código (400/404/413) com { error, detalhes };
                        qualquer outra exceção → log + 500 genérico
```

### Banco de dados (Etapa 4)
- **8 tabelas** definidas em [`prisma/schema.prisma`](../apps/api/prisma/schema.prisma): `unidades`, `usuarios`, `motivos`, `importacoes`, `clientes`, `veiculos`, `ordens_servico`, `revisoes_alvo`. O desenho completo está no [README, seção 3](../README.md#3-modelo-de-dados-rascunho).
- **Chaves de negócio únicas:** `veiculos.chassi` (cruzamento com as OS) e `revisoes_alvo (veiculo_id, km)`, que impede a mesma revisão duas vezes na fila e acaba com as linhas repetidas da planilha.
- **Índices** nas colunas mais filtradas: `ordens_servico.chassi`, `revisoes_alvo.situacao`, `operador_id` e `unidade_id`.
- **Concorrência:** `revisoes_alvo.versao` prepara o *optimistic locking* da Etapa 8.
- **Migrações versionadas:** cada mudança no schema vira uma pasta em `prisma/migrations/` com o SQL. Elas vão para o Git, para que qualquer máquina chegue ao mesmo banco.
- **Usuário próprio:** a API conecta como `pos_venda` (dono só do banco do sistema), nunca como o administrador `postgres`.
- **Seed idempotente:** usa `upsert`, então pode rodar várias vezes. Só tem dados fictícios.

### Decisões e boas práticas
- **`app.ts` separado de `server.ts`:** permite testar o app sem abrir porta (Etapa 6, com `vitest` + `supertest`).
- **Configuração centralizada (`config.ts`):** no código da API, nenhum outro arquivo lê `process.env`. A exceção é o `prisma.config.ts`, que é do Prisma CLI. As variáveis ficam documentadas em `.env.example`, e as obrigatórias (`DATABASE_URL`) param a API na inicialização com uma mensagem clara.
- **Conexão única com o banco (`db/prisma.ts`):** uma instância do PrismaClient para toda a API, evitando esgotar as conexões.
- **A listagem devolve só o necessário:** `select` explícito, sem CPF, com paginação limitada a 100 itens.
- **Segredos fora do Git:** `.env` está no `.gitignore`.
- **Rotas em arquivos próprios (`routes/`):** cada assunto (revisões, importações, usuários) terá seu arquivo, montado em `app.ts`.
- **Erros não vazam detalhes:** o cliente recebe "Erro interno do servidor", e o detalhe fica no log.
- **Erros esperados com `ErroHttp` (`lib/erros.ts`):** o serviço lança `new ErroHttp(404, "...")` e o tratador central responde no formato padrão `{ error, detalhes }`. Nenhuma rota monta resposta de erro à mão.
- **Validação com `zod` (`schemas/`):** cada rota valida a entrada antes de chamar o serviço. Valores inválidos viram 400 com o nome do campo, em vez de serem ignorados.
- **Distribuição em transação:** `distribuirRevisoes` roda dentro de `$transaction`. Se algo falhar no meio, nada é gravado. Cada `updateMany` só altera revisões que continuam sem operadora, então duas pessoas distribuindo ao mesmo tempo não pegam a mesma revisão.
- **CSV seguro para Excel (`lib/csv.ts`):** BOM UTF-8 (acentos), separador `;` (Excel em português) e prefixo `'` em valores que começam com `= + - @`, para evitar *injeção de fórmula*.
- **ESM (`"type": "module"`):** padrão moderno do Node. Por isso os imports terminam em `.js`.

### Camadas da API
```
src/
├── routes/        ✅ recebe a requisição HTTP e responde
├── schemas/       ✅ formato aceito em cada rota (zod)
├── services/      ✅ regras de negócio (filtros, distribuição; cruzamento por chassi na Etapa 6)
├── lib/           ✅ utilitários: erros, validação, CSV, formatos
├── db/            ✅ acesso ao banco (Prisma)
└── middlewares/   ⏳ autenticação, permissões, log (Etapa 9)
```
Regra: **rota fina, serviço gordo**. A rota só traduz HTTP; a regra de negócio fica no serviço, onde é fácil testar.

---

## 4. Frontend: `apps/web`

### Tecnologias
| Pacote | Para quê |
|---|---|
| `react` (v19) | Biblioteca de interface baseada em componentes |
| `react-router-dom` | Navegação entre páginas pela URL |
| `bootstrap` (v5.3) | Componentes e grid prontos (botões, cards, responsividade) |
| `bootstrap-icons` | Ícones (`<i className="bi bi-people" />`) |
| `sass` | Pré-processador CSS: variáveis, aninhamento, mixins |
| `vite` | Servidor de desenvolvimento e build |
| `oxlint` | Verifica problemas no código (`npm run lint`) |

### Como a tela é montada
```
index.html
 └─ <div id="root">
     └─ main.tsx
         ├─ carrega estilos (bootstrap-icons + main.scss)
         └─ <BrowserRouter>
             └─ <App>                    App.tsx: rotas
                 └─ <Layout>             menu lateral + barra superior
                     └─ <Outlet>         ← a página da URL atual entra aqui
                         ├─ /dashboard     → Dashboard.tsx
                         ├─ /revisoes      → Revisoes.tsx
                         ├─ /atendimentos  → Atendimentos.tsx
                         ├─ /importacoes   → Importacoes.tsx
                         ├─ /usuarios      → Usuarios.tsx
                         └─ (outra)        → NaoEncontrada.tsx
```

### Fluxo de dados (exemplo: Dashboard)
```
Dashboard abre
  → useEffect chama apiGet<Health>('/health')       (lib/api.ts)
  → fetch('/api/health') → proxy do Vite → API
  → resposta vira estado: 'carregando' → 'ok' | 'erro'
  → a tela re-renderiza: "API ok" ou o aviso de erro
```

### Tema (Sass + Bootstrap)
```
_variables.scss   →  bootstrap  →  _layout.scss
(nossas cores)       (gera CSS)     (estilos próprios)
```
O Bootstrap usa `!default` nas variáveis, então as que definimos **antes** dele prevalecem. Trocar `$primary` muda todos os botões, links e destaques de uma vez.

### Decisões e boas práticas
- **Uma página por arquivo (`pages/`)** e **peças reutilizáveis em `components/`**.
- **Chamadas à API centralizadas em `lib/api.ts`:** um só lugar para tratar erros e, na Etapa 9, enviar o token de login.
- **Tipos das respostas da API declarados** (ex.: `Health`): o TypeScript avisa se usarmos um campo que não existe.
- **Estado com união discriminada** (`carregando | ok | erro`): impossível mostrar dados sem eles existirem.
- **Responsivo e acessível:** menu recolhível no celular, `aria-label` nos botões só com ícone, ícones decorativos com `aria-hidden`.
- **Cores só via variáveis Sass:** nunca escrever `#cc0000` direto num componente.
- **Filtros na URL (`useSearchParams`):** a fila pode ser recarregada, voltada ou compartilhada por link sem perder os filtros.
- **Sem respostas fora de ordem:** cada busca cancela a anterior (`AbortController`), e o texto da busca passa por `useDebounce` antes de virar requisição.
- **Estado de carregamento derivado:** a página compara a "chave" da última resposta com a dos filtros atuais em vez de guardar um `carregando` separado. Assim, nunca mostra a lista de um filtro com o rótulo de outro.

---

## 5. Padrões do projeto

| Tema | Padrão |
|---|---|
| Idioma | Código em inglês quando é termo técnico (`app`, `router`), e domínio em **português** (`revisoes`, `importacoes`). Comentários e docs em português |
| Comentários | Todo arquivo começa com um cabeçalho dizendo **o que é e por que existe**. Funções e tipos exportados têm JSDoc (`/** ... */`) |
| Nomes de arquivo | Componentes React em `PascalCase.tsx`; demais em `camelCase.ts`; parciais Sass com `_` |
| Commits | Um commit por etapa ou item, no formato `tipo(escopo): descrição`: `feat` (novidade), `fix` (correção), `refactor`, `docs` |
| Antes de commitar | `npm run check` na raiz (typecheck da API, lint e build do frontend) sem erros |
| Rodar em desenvolvimento | `npm run dev` na raiz sobe API e frontend juntos. Cada app continua independente, com seu próprio `package.json` |
| Dados | **Só dados fictícios** no código, seeds e testes. As planilhas reais ficam em `Documentos/` (ignorada) |
| Segredos | Só no `.env` (ignorado). Toda variável nova é documentada no `.env.example` |

---

## 6. Próximas camadas

| Etapa | O que entra na arquitetura |
|---|---|
| ~~4~~ | ✅ PostgreSQL + Prisma: concluída (ver seção 3) |
| 6 | Upload (`multer`), leitura de planilhas (`exceljs`, `csv-parse`), testes (`vitest`). O `zod` já entrou na Etapa 7 |
| ~~7~~ | ✅ Fila de revisões: `schemas/`, `lib/`, rotas de catálogo, atribuir, distribuir e exportar |
| 9 | Login (JWT ou sessão), middleware de permissões, tabela de auditoria |
| 11 | Hospedagem da API e do frontend, backup do banco |

Modelo de dados planejado: [README.md, seção 3](../README.md#3-modelo-de-dados-rascunho).
