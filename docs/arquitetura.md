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
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts       exigirLogin (401) e exigirPerfil (403); req.usuario
│   │   │   ├── routes/           CAMADA HTTP: lê a requisição e responde
│   │   │   │   ├── health.ts     GET /api/health
│   │   │   │   ├── auth.ts       Login, logout, "quem sou eu", trocar senha
│   │   │   │   ├── revisoes.ts   Fila: listar, exportar, atribuir, distribuir; tela do cliente
│   │   │   │   ├── usuarios.ts   Cadastro de usuários e auditoria (só Admin)
│   │   │   │   └── catalogos.ts  GET /api/unidades, /operadoras, /motivos
│   │   │   ├── schemas/          VALIDAÇÃO: formato aceito em cada rota (zod)
│   │   │   │   ├── auth.ts       Login e regra de senha
│   │   │   │   ├── usuarios.ts   Criar, alterar, redefinir senha
│   │   │   │   ├── revisoes.ts   Filtros, paginação, atribuir e distribuir
│   │   │   │   └── atendimentos.ts  Registrar contato (validação condicional) e concluir
│   │   │   ├── services/         CAMADA DE REGRAS: consultas e regras de negócio
│   │   │   │   ├── auth.ts       Conferir senha, bloquear tentativas, trocar senha
│   │   │   │   ├── usuarios.ts   Cadastro; nunca ficar sem Admin; desativar libera a carteira
│   │   │   │   ├── auditoria.ts  Grava e lista "quem alterou o quê e quando"
│   │   │   │   ├── revisoes.ts   Filtros, paginação, atribuição e distribuição
│   │   │   │   └── atendimentos.ts  Tentativas, situação da revisão, proteção contra sobrescrita
│   │   │   ├── lib/              Utilitários sem regra de negócio
│   │   │   │   ├── erros.ts      ErroHttp: erro com código HTTP
│   │   │   │   ├── validar.ts    Valida com zod e lança 400 com os campos errados
│   │   │   │   ├── senhas.ts     Hash bcrypt e "impressão" da senha
│   │   │   │   ├── tokens.ts     Token JWT e opções do cookie de sessão
│   │   │   │   ├── limiteLogin.ts 5 erros seguidos → bloqueio de 15 min
│   │   │   │   ├── csv.ts        Gera CSV para Excel (BOM, ";", anti-fórmula)
│   │   │   │   ├── formatar.ts   Datas, celular e situação em texto
│   │   │   │   └── datas.ts      Datas "só dia" (agendada, próximo contato), sem erro de fuso
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
│       ├── public/marca/         Logo e ícone da aba (gerados por scripts/gerar-marca.py)
│       └── src/
│           ├── main.tsx          Ponto de entrada: estilos + roteador + sessão + <App/>
│           ├── App.tsx           Mapa de rotas (URL → página), conforme o login
│           ├── auth/             Sessão de login (Etapa 9)
│           │   ├── contexto.ts   useAuth(): quem está logado, entrar, sair
│           │   └── AuthProvider.tsx Pergunta "quem sou eu" à API e guarda o usuário
│           ├── components/       Peças reutilizáveis
│           │   ├── Layout.tsx    Menu lateral + barra superior (usuário, Sair) + área da página
│           │   ├── menu.ts       Lista de itens do menu (com a permissão de cada um)
│           │   ├── ExigirPermissao.tsx Esconde a página de quem não tem o perfil
│           │   ├── PageHeader.tsx Título padrão das páginas
│           │   ├── EmBreve.tsx   Aviso "em construção"
│           │   ├── BadgeSituacao.tsx Etiqueta colorida da situação
│           │   ├── Paginacao.tsx "1–20 de N" com anterior/próxima
│           │   ├── revisoes/     Peças da fila: filtros, tabela, painel Distribuir
│           │   ├── atendimentos/ Formulário "Registrar contato" e histórico
│           │   └── usuarios/     Formulário de usuário, senha provisória, auditoria
│           ├── hooks/
│           │   └── useDebounce.ts Espera parar de digitar antes de buscar
│           ├── pages/            Uma página por arquivo (Login, Dashboard, Revisoes, Usuarios…)
│           ├── lib/
│           │   ├── api.ts        Funções para chamar a API + tipos das respostas
│           │   ├── permissoes.ts O que cada perfil pode fazer (espelha a API)
│           │   ├── senhas.ts     Regra de senha e gerador de senha provisória
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
│   ├── marca/logo-original.webp  Logo original (fundo transparente), fonte das versões em apps/web/public/marca/
│   └── apresentacao-proposta.pptx
├── scripts/
│   └── gerar-marca.py            Gera logo clara, logo branca e ícones a partir da logo original
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
   ├─ cors()            libera a origem http://localhost:5173 (com cookies)
   ├─ cookieParser()    lê o cookie de sessão
   ├─ express.json()    lê corpo JSON (PATCH/POST, até 100 kB); JSON malformado → 400
   ├─ /api/health   ──► routes/health.ts  ──► 200 { ok: true }           (aberta)
   ├─ /api/auth     ──► routes/auth.ts    ──► login, logout, eu, senha   (aberta)
   ├─ /api/revisoes ──► middleware/auth.ts exigirLogin  (sem sessão → 401)
   │                    └─► routes/revisoes.ts
   │                      ├─► exigirPerfil(...)  em atribuir, distribuir, contatos (sem permissão → 403)
   │                      ├─► lib/validar.ts + schemas/revisoes.ts  (zod; inválido → 400)
   │                      └─► services/revisoes.ts   (monta o filtro e a consulta)
   │                            └─► db/prisma.ts ──► PostgreSQL
   │                      ◄── 200 { itens, total, pagina, ... }
   ├─ /api/usuarios, /api/auditoria ──► exigirLogin + exigirPerfil(ADMIN) ──► routes/usuarios.ts
   ├─ /api/unidades, /operadoras, /motivos ──► exigirLogin ──► routes/catalogos.ts
   ├─ 404               (só chega aqui se nenhuma rota respondeu)
   └─ tratador de erro  ErroHttp → seu código (400/404/413) com { error, detalhes };
                        qualquer outra exceção → log + 500 genérico
```

### Banco de dados (Etapa 4)
- **10 tabelas** definidas em [`prisma/schema.prisma`](../apps/api/prisma/schema.prisma): `unidades`, `usuarios`, `motivos`, `importacoes`, `clientes`, `veiculos`, `ordens_servico`, `revisoes_alvo`, `tentativas_contato` (Etapa 8) e `auditoria` (Etapa 9). O desenho completo está no [README, seção 3](../README.md#3-modelo-de-dados-rascunho).
- **Chaves de negócio únicas:** `veiculos.chassi` (cruzamento com as OS) e `revisoes_alvo (veiculo_id, km)`, que impede a mesma revisão duas vezes na fila e acaba com as linhas repetidas da planilha.
- **Índices** nas colunas mais filtradas: `ordens_servico.chassi`, `revisoes_alvo.situacao`, `operador_id` e `unidade_id`.
- **Concorrência (*optimistic locking*, Etapa 8):** toda gravação na revisão é um `updateMany` com `WHERE id = ? AND versao = ?` que também soma 1 à versão. Se outra pessoa gravou antes, a versão já mudou, nenhuma linha é alterada e a API responde **409** sem gravar nada. Não há bloqueio de registro: ninguém fica "preso" esperando.
- **Histórico só cresce:** `tentativas_contato` só recebe inserções. A situação da revisão é sempre calculada a partir da última tentativa (`efeitoDaTentativa`), inclusive ao reabrir uma revisão concluída.
- **Datas só dia:** `data_agendada` e `proximo_contato` são `DATE` (sem hora). O Prisma devolve meia-noite UTC, então elas são formatadas **sem fuso** (`diaBR`, em `lib/datas.ts` e `apps/web/src/lib/formatar.ts`). Datas com hora (venda, registro do contato) usam o fuso `America/Fortaleza`.
- **Migração com conversão de dados:** a `20261112120053_atendimentos` foi gerada por `prisma migrate diff` e ajustada à mão para converter `motivos.encerra_cliente` em `motivos.acao` antes de apagar a coluna antiga.
- **Auditoria só cresce (Etapa 9):** `auditoria` só recebe inserções, gravadas **na mesma transação** da alteração (ou ficam as duas, ou nenhuma). `detalhes` é JSON com o que mudou (ex.: `{ ativo: { de: true, para: false } }`), nunca com senhas ou hashes.
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

### Login e permissões (Etapa 9)
```
Tela de login ──POST /api/auth/login { email, senha }──► services/auth.ts
                                                          ├─ limite: 5 erros → 429 por 15 min
                                                          ├─ bcrypt.compare (mesmo tempo se o e-mail não existe)
                                                          └─ JWT { sub: id, sv: impressão da senha }, 10 h
             ◄── Set-Cookie: sessao=…; HttpOnly; SameSite=Strict; Path=/api ──┘

Toda chamada seguinte: o navegador manda o cookie sozinho
  └─► exigirLogin: confere a assinatura e a validade do JWT
                   + busca o usuário no banco: ativo? a senha é a mesma do token?
                   → req.usuario = { id, nome, perfil, unidadeId }
      └─► exigirPerfil(GESTOR, ADMIN)  (quando a rota pede)
          └─► serviço: regras finas (operadora só a própria carteira) + auditar(...)
```
- **Cookie `httpOnly` em vez de `localStorage`:** o JavaScript da página não consegue ler o token, então um script malicioso não rouba a sessão. `SameSite=Strict` impede que outro site faça gravações em nome de quem está logado (CSRF). Em produção o cookie também é `Secure` (só HTTPS).
- **O token guarda só o id e a "impressão" da senha:** perfil, nome e `ativo` são lidos do banco a cada requisição. Por isso desativar alguém, mudar o perfil ou trocar a senha vale **na hora**, sem esperar o token vencer.
- **Mensagem única no login errado** ("E-mail ou senha incorretos") e o bcrypt roda mesmo quando o e-mail não existe, para ninguém descobrir quais e-mails estão cadastrados.
- **Senha provisória:** quem recebe a senha do Admin fica com `trocar_senha = true`. Até trocar, a API recusa qualquer rota fora de `/api/auth` (403 `TROCAR_SENHA`).
- **Ninguém é apagado:** usuários só são desativados, para o nome continuar no histórico. O sistema nunca fica sem um Admin ativo, e o Admin não pode desativar a si mesmo.
- **Operadora só vê a própria carteira:** a rota troca o filtro `operador` pelo id dela, e as revisões de outras pessoas respondem 404, como se não existissem.
- **Limites na memória:** o contador de tentativas de login fica na memória da API, o que basta para um servidor. Com vários servidores, levar para o banco ou para o Redis.
- **A tela só esconde; quem protege é a API:** `lib/permissoes.ts` do frontend espelha as regras para esconder menus e botões, mas a segurança está nos middlewares.

### Camadas da API
```
src/
├── routes/        ✅ recebe a requisição HTTP e responde
├── middleware/    ✅ login (401) e perfil (403) — Etapa 9
├── schemas/       ✅ formato aceito em cada rota (zod)
├── services/      ✅ regras de negócio (filtros, distribuição, usuários, auditoria; cruzamento por chassi na Etapa 6)
├── lib/           ✅ utilitários: erros, validação, CSV, formatos, senhas, tokens
└── db/            ✅ acesso ao banco (Prisma)
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
             └─ <AuthProvider>           GET /api/auth/eu: quem está logado?
                 └─ <App>                App.tsx: rotas conforme o login
                     ├─ ninguém logado     → Login.tsx (qualquer URL leva a ela)
                     ├─ senha provisória   → TrocarSenha.tsx (obrigatória)
                     └─ <Layout>         menu (filtrado pelo perfil) + barra superior
                         └─ <Outlet>     ← a página da URL atual entra aqui
                             ├─ /dashboard     → Dashboard.tsx
                             ├─ /revisoes      → Revisoes.tsx (operadora: "Minha carteira")
                             ├─ /revisoes/:id  → RevisaoDetalhe.tsx
                             ├─ /atendimentos  → Atendimentos.tsx
                             ├─ /importacoes   → <ExigirPermissao importar> Importacoes.tsx
                             ├─ /usuarios      → <ExigirPermissao usuarios> Usuarios.tsx
                             ├─ /minha-senha   → TrocarSenha.tsx
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
- **Chamadas à API centralizadas em `lib/api.ts`:** um só lugar para tratar erros e a sessão. O cookie vai sozinho (`credentials: 'same-origin'`); quando a API responde 401, `api.ts` dispara o evento `sessao-expirada` e o `AuthProvider` volta para o login com o aviso "sua sessão expirou".
- **Login lembra a página pedida:** quem abre um link sem estar logado entra e cai na página do link. Depois de um "Sair" isso não acontece, porque a próxima pessoa pode ser outra.
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
| ~~8~~ | ✅ Atendimentos: `tentativas_contato`, tela do cliente, proteção contra sobrescrita (409) |
| ~~9~~ | ✅ Login (JWT em cookie `httpOnly`), `middleware/auth.ts`, perfis, tela de Usuários, tabela `auditoria` |
| 11 | Hospedagem da API e do frontend, backup do banco |

Modelo de dados planejado: [README.md, seção 3](../README.md#3-modelo-de-dados-rascunho).
