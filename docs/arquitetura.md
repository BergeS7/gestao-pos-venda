# Arquitetura do sistema

Como o sistema está organizado **hoje** (Etapas 1 a 3 do [ROTEIRO.md](../ROTEIRO.md)) e para onde ele vai. **Atualize este documento a cada etapa concluída.**

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
   │  API Express  (apps/api)             │  3. a API responde JSON
   │  http://localhost:3333               │     { ok: true, ... }
   │                                      │
   │  (Etapa 4) ──► PostgreSQL            │  4. no futuro, lê e grava
   └──────────────────────────────────────┘     no banco de dados
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
│   │   │   └── routes/
│   │   │       └── health.ts     GET /api/health
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
│           │   └── EmBreve.tsx   Aviso "em construção"
│           ├── pages/            Uma página por arquivo (Dashboard, Importações…)
│           ├── lib/
│           │   └── api.ts        Funções para chamar a API + tipos das respostas
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
├── README.md                     Visão geral e como rodar
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

### Caminho de uma requisição
```
GET /api/health
   │
   ▼
server.ts  ── app.listen(3333)
   │
   ▼
app.ts
   ├─ cors()            libera a origem http://localhost:5173
   ├─ express.json()    lê corpo JSON (para POST/PUT futuros)
   ├─ /api/health  ───► routes/health.ts  ──► 200 { ok: true, ... }   ✔ respondeu
   ├─ 404               (só chega aqui se nenhuma rota respondeu)
   └─ tratador de erro  (qualquer exceção vira 500 com mensagem genérica)
```

### Decisões e boas práticas
- **`app.ts` separado de `server.ts`:** permite testar o app sem abrir porta (Etapa 6, com `vitest` + `supertest`).
- **Configuração centralizada (`config.ts`):** nenhum outro arquivo lê `process.env`. As variáveis ficam documentadas em `.env.example`.
- **Segredos fora do Git:** `.env` está no `.gitignore`.
- **Rotas em arquivos próprios (`routes/`):** cada assunto (revisões, importações, usuários) terá seu arquivo, montado em `app.ts`.
- **Erros não vazam detalhes:** o cliente recebe "Erro interno do servidor", e o detalhe fica no log.
- **ESM (`"type": "module"`):** padrão moderno do Node. Por isso os imports terminam em `.js`.

### Como vai crescer
```
src/
├── routes/        recebe a requisição HTTP e valida a entrada (zod)
├── services/      regras de negócio (ex.: cruzamento por chassi)
├── db/            acesso ao banco (Prisma)
└── middlewares/   autenticação, permissões, log
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

---

## 5. Padrões do projeto

| Tema | Padrão |
|---|---|
| Idioma | Código em inglês quando é termo técnico (`app`, `router`), e domínio em **português** (`revisoes`, `importacoes`). Comentários e docs em português |
| Comentários | Todo arquivo começa com um cabeçalho dizendo **o que é e por que existe**. Funções e tipos exportados têm JSDoc (`/** ... */`) |
| Nomes de arquivo | Componentes React em `PascalCase.tsx`; demais em `camelCase.ts`; parciais Sass com `_` |
| Commits | Um commit por etapa ou item, no formato `tipo(escopo): descrição`: `feat` (novidade), `fix` (correção), `refactor`, `docs` |
| Antes de commitar | `npm run typecheck` (api), `npm run build` e `npm run lint` (web) sem erros |
| Dados | **Só dados fictícios** no código, seeds e testes. As planilhas reais ficam em `Documentos/` (ignorada) |
| Segredos | Só no `.env` (ignorado). Toda variável nova é documentada no `.env.example` |

---

## 6. Próximas camadas

| Etapa | O que entra na arquitetura |
|---|---|
| 4 | **PostgreSQL + Prisma** em `apps/api`: `prisma/schema.prisma` (tabelas), migrações e seed fictício |
| 6 | Upload (`multer`), leitura de planilhas (`exceljs`, `csv-parse`), validação (`zod`), testes (`vitest`) |
| 9 | Login (JWT ou sessão), middleware de permissões, tabela de auditoria |
| 11 | Hospedagem da API e do frontend, backup do banco |

Modelo de dados planejado: [README.md, seção 3](../README.md#3-modelo-de-dados-rascunho).
