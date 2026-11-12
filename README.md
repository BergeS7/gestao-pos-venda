# Gestão do Pós-Venda — Maranhão Motos

Sistema web para organizar o **pós-venda de revisões da oficina** da Maranhão Motos. Ele substitui as planilhas compartilhadas e o cruzamento manual de relatórios do Cloud por uma base central, com fila de ligações, histórico de contatos e indicadores de produção da equipe.

> **Status:** em desenvolvimento inicial. A lógica do sistema segue as planilhas reais da operação, descritas em detalhe em [docs/regras-de-negocio.md](docs/regras-de-negocio.md). O passo a passo está em [ROTEIRO.md](ROTEIRO.md).

---

## 1. Como a operação funciona hoje

1. Exportar do **Cloud** a **lista de revisões**: clientes com revisão prevista (1000, 6000, 12000 ou 18000 km), filtrada pelo mês de venda da moto.
2. Exportar do Cloud o **espelhamento de OS**: ordens de serviço já abertas (chassi + tipo de OS).
3. No Excel, **cruzar pelo chassi**: quem já tem OS de revisão sai da lista.
4. A lista que sobra é dividida entre as **operadoras** e copiada para a planilha de acompanhamento.
5. Cada operadora liga ou manda WhatsApp e registra: *conseguiu falar?*, *agendou?* (sim/não/retornar), *motivo*, *data agendada*, *status* (concluída ou não).
6. Todo mês, um **relatório de produção** é montado à mão, por operadora e por unidade (Santa Inês, Zé Doca, Buriticupu), com um ranking de % de contato, % de agendamento, % de conclusão e as causas de não agendamento.

### Problemas
| Problema | Impacto |
|---|---|
| Planilha compartilhada com edição simultânea | Conflitos e sobrescrita no Drive |
| Cruzamento manual lista × OS | Retrabalho e erro humano |
| Texto livre nos campos (`sim`/`SIM`, datas inválidas, município com e sem `/MA`) | Relatórios inconsistentes |
| Novas tentativas viram linhas duplicadas | Histórico confuso e contagem errada |
| Relatório mensal montado à mão, com fórmulas quebradas | Esforço e pouca confiabilidade |

### Como será com o sistema

```
Cloud ─► Lista de revisões (xlsx) ─┐
                                   ├─► Importação ─► Cruzamento por CHASSI ─► Fila elegível
Cloud ─► Espelhamento de OS (xlsx) ┘                                              │
                                                                                  ▼
   Dashboard / Produção ◄── Registro do contato ◄── Distribuição entre operadoras
            ▲                                                                     
            └── Espelhamento do mês seguinte confirma as revisões concluídas
```

A equipe **continua exportando os arquivos do Cloud**. A versão 1 não tem integração por API.

---

## 2. Escopo do MVP

### 2.1 Importações
- Upload de **lista de revisões** e **espelhamento de OS** (`.xlsx` ou `.csv`).
- Etapas: **Arquivos → Validação → Cruzamento → Confirmação**.
- Normalizações: chassi (17 caracteres, maiúsculo), CPF, celular e município (sem `/MA`).
- **Elegível** = chassi da lista **sem** OS no espelhamento.
- Mostra duplicidades, inconsistências e clientes removidos por já terem OS.
- Histórico de importações.

### 2.2 Fila / carteira
- Um registro por **cliente + chassi + revisão (km)**.
- Colunas: cliente, celular, modelo, chassi, km da revisão, município, unidade, operadora, situação, último contato, próximo contato.
- Filtros por unidade, operadora, revisão, situação e mês de venda.
- Distribuição entre operadoras e exportação.

### 2.3 Registro do contato
Mesmos campos da planilha atual, agora com validação:

| Campo | Valores | Regra |
|---|---|---|
| Conseguiu falar? | sim / não | obrigatório |
| Agendou? | sim / não / retornar | obrigatório |
| Motivo | lista fixa (ver abaixo) | obrigatório se *não* ou *retornar* |
| Data agendada | data | obrigatória se *sim* |
| Próximo contato | data | obrigatória se *retornar* |
| Observações | texto | opcional |

**Motivos:** Retornar depois · Km não atingida · Contato não funciona (buscar) · Mecânico de confiança · Em abstenção · Se desfez da moto · Moto revenda · Sem condição financeira · Muito distante · Realiza em outra autorizada · Acha caro e serviço simples.

Cada tentativa fica no **histórico** do registro, em vez de virar uma linha nova.

### 2.4 Dashboard e produção mensal
Reproduz o relatório de produção atual, mas calculado automaticamente:
- Por **operadora × unidade**: total de clientes, conseguiu falar, não conseguiu, agendados, concluídos.
- Rankings: **% contato** (falou ÷ total), **% agendamento** (agendados ÷ falou), **% conclusão** (concluídos ÷ agendados), **% concluídos da base por unidade**.
- **Causas de não agendamento** por operadora × unidade, com %.
- Filtros por mês, unidade e operadora.

### 2.5 Usuários e permissões
| Perfil | Pode |
|---|---|
| **Operadora** (colaborador) | Trabalhar a própria fila e registrar contatos |
| **Gestor de Pós-Venda** | Importar, distribuir, ver todos os registros e relatórios |
| **Diretoria** | Ver indicadores consolidados |
| **Administrador / TI** | Usuários, permissões e auditoria |

Toda alteração registra autor e data/hora. Há proteção contra sobrescrita entre usuários.

**Como funciona o acesso (Etapa 9):**

| | Operadora | Gestor | Diretoria | Admin |
|---|---|---|---|---|
| Ver a fila | só a própria carteira | todas | todas | todas |
| Registrar contato e concluir | sim | sim | — | sim |
| Atribuir e distribuir | — | sim | — | sim |
| Importações | — | sim | — | sim |
| Usuários e auditoria | — | — | — | sim |

- Login com **e-mail e senha**. O Admin cria o usuário com uma **senha provisória**, que a pessoa troca no primeiro acesso.
- Senha com pelo menos 8 caracteres, letras e números. 5 erros seguidos bloqueiam o login por 15 minutos.
- Usuário que sai da equipe é **desativado** (não apagado): perde o acesso na hora, e as revisões abertas da carteira dele voltam para "sem operadora".

---

## 3. Modelo de dados (rascunho)

```
unidades          (id, sigla [STI|ZDC|BRT], nome)
usuarios          (id, nome, email UNIQUE, senha_hash, trocar_senha, perfil,
                   unidade_id, ativo, ultimo_acesso)
importacoes       (id, usuario_id, tipo [revisoes|os], arquivo, periodo_ref,
                   total_linhas, total_validos, total_invalidos, status, criado_em)
clientes          (id, nome, cpf_cnpj, celular, municipio)
veiculos          (id, chassi UNIQUE, modelo, cor, data_venda, cliente_id)
ordens_servico    (id, chassi, tipo_os, codigo_assistencia, importacao_id)
revisoes_alvo     (id, veiculo_id, km [1000|6000|12000|18000], importacao_id,
                   unidade_id, operador_id, situacao, data_agendada, proximo_contato,
                   concluida, versao, UNIQUE(veiculo_id, km))
tentativas_contato(id, revisao_id, usuario_id, criado_em, conseguiu_falar,
                   resultado [sim|nao|retornar], motivo_id, data_agendada,
                   proximo_contato, observacoes)
motivos           (id, descricao, acao [retornar|buscar_contato|encerrar], ativo)
auditoria         (id, usuario_id, acao, entidade, entidade_id, detalhes JSON, criado_em)
```

**Situação de `revisoes_alvo`:** `pendente` → `retornar` | `agendado` | `nao_agendado` | `buscar_contato` → `concluida`.

A coluna `versao` permite *optimistic locking*: uma gravação feita sobre uma versão antiga é bloqueada e o usuário é avisado.

**Como cada ligação muda a situação** (regra em `apps/api/src/services/atendimentos.ts`):

| Agendou? | Ação do motivo | Nova situação |
|---|---|---|
| Sim | — | `agendado` (com data agendada) |
| Retornar | qualquer | `retornar` (com próximo contato) |
| Não | retornar (ex.: "Km não atingida") | `retornar` (com próximo contato) |
| Não | buscar contato | `buscar_contato` |
| Não | encerrar (ex.: "Se desfez da moto") | `nao_agendado` |

---

## 4. Stack

| Camada | Tecnologia |
|---|---|
| Interface | **React + TypeScript** (Vite), **Bootstrap + Sass** |
| API | **Node.js + Express** (TypeScript) |
| Banco | **PostgreSQL** (Supabase como opção) |
| Planilhas | `exceljs` / `csv-parse`. **Python** (pandas) só se a limpeza ficar pesada |

### Identidade visual
| Cor | Hex | Uso sugerido |
|---|---|---|
| Vermelho | `#cc0000` | `$primary`, botões e destaques |
| Cinza escuro | `#5c5c5c` | Menu lateral e textos secundários |
| Cinza claro | `#b2b0b0` | Bordas e fundos |
| Branco | `#ffffff` | Fundo |
| Preto | `#000000` | Texto |

### Estrutura de pastas
```
gestao-pos-venda/
├── apps/
│   ├── web/          # React + TypeScript + Bootstrap/Sass
│   └── api/          # Express + TypeScript
├── db/
│   ├── migrations/
│   └── seed/         # Somente dados FICTÍCIOS
├── docs/             # Regras de negócio e apresentação
├── Documentos/       # Planilhas reais (ignorada pelo Git)
└── README.md
```

---

## 5. Começando

```bash
git clone https://github.com/BergeS7/gestao-pos-venda.git
cd gestao-pos-venda
```

Pré-requisitos: Node.js 20+, Git e PostgreSQL 15+ (testado com o 18). O passo a passo completo está no [ROTEIRO.md](ROTEIRO.md).

> **Windows / PowerShell:** se aparecer *"a execução de scripts foi desabilitada neste sistema"*, use `npm.cmd` no lugar de `npm` (ex.: `npm.cmd run dev`). Outra opção é liberar scripts locais só para o seu usuário com `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, que é uma decisão sua de segurança.

### ⚡ Rodar tudo com um comando (raiz do projeto)

**Primeira vez:**

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:setup
npm run db:migrate
npm run db:seed
```

O `npm install` na raiz já instala também as dependências de `apps/api` e `apps/web`.

No `apps/api/.env`, troque o `JWT_SECRET` por uma chave aleatória (a API não sobe com chave curta):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Usuários de teste** (fictícios, criados pelo seed): `admin@exemplo.local`, `gestor@exemplo.local`, `diretoria@exemplo.local` e `operadora.a@exemplo.local` (também `.b` e `.c`). A senha de desenvolvimento é a `SEED_SENHA` do `.env` ou, se ela estiver vazia, `Exemplo2026`. Em produção o seed não define senhas.

**No dia a dia:**

```bash
npm run dev
```

Esse comando sobe **a API (porta 3333) e o frontend (porta 5173) juntos**, no mesmo terminal. Os logs aparecem com o prefixo `[api]` (vermelho) ou `[web]` (azul). Abra <http://localhost:5173>. `Ctrl + C` para os dois.

| Script (raiz) | O que faz |
|---|---|
| `npm run dev` | Sobe API e frontend juntos (usa o pacote `concurrently`) |
| `npm run dev:api` / `npm run dev:web` | Sobe só um dos dois |
| `npm run install:all` | Instala as dependências dos dois apps (roda sozinho após `npm install`) |
| `npm run build` | Compila a API e gera a versão de produção do frontend |
| `npm run check` | Conferência antes do commit: typecheck da API, lint e build do frontend |
| `npm run db:setup` / `db:migrate` / `db:seed` / `db:studio` | Atalhos para os comandos de banco da API |

Os comandos de cada app continuam funcionando dentro das pastas deles, conforme abaixo.

### 🧩 No VS Code

1. **Abra a pasta do projeto:** *Arquivo → Abrir Pasta…* → `gestao-pos-venda`. Ou, num terminal, rode `code gestao-pos-venda`.
2. **Inicie o sistema:** `Ctrl + Shift + B` roda a tarefa **"Iniciar sistema (API + web)"**.
   - Ou abra o terminal (`` Ctrl + ` ``) e rode `npm run dev`.
3. Abra <http://localhost:5173>. Para parar, clique no terminal e pressione `Ctrl + C` (ou use o ícone de lixeira do terminal).

O projeto já vem configurado em `.vscode/`:

| Arquivo | O que faz |
|---|---|
| `settings.json` | Terminal padrão = **Prompt de Comando (cmd)**, onde `npm` funciona sem o bloqueio do PowerShell. Também ativa formatar ao salvar |
| `tasks.json` | Atalhos em *Ctrl+Shift+P → Tasks: Run Task*: iniciar sistema, conferir antes do commit, Prisma Studio, migrações e seed |
| `extensions.json` | Extensões recomendadas (Prisma, oxlint, Prettier, Sass, corretor pt-BR). O VS Code sugere instalar ao abrir |

### API (`apps/api`)

**Primeira vez:**

```bash
cd apps/api
npm install
cp .env.example .env
npm run db:setup
npm run db:migrate
npm run db:seed
```

- `db:setup` cria o usuário e o banco no PostgreSQL local e grava a `DATABASE_URL` no `.env`. Ele pede a senha do usuário `postgres` definida na instalação.
- `db:migrate` cria as tabelas.
- `db:seed` insere unidades, motivos e dados **fictícios** de exemplo.

**No dia a dia:**

```bash
cd apps/api
npm run dev
```

Teste em <http://localhost:3333/api/health>. As outras rotas exigem login (a resposta sem login é 401).

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe a API em modo desenvolvimento e reinicia a cada alteração |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm start` | Roda a versão compilada |
| `npm run typecheck` | Confere os tipos sem compilar |
| `npm run db:setup` | Cria o banco local e o usuário do sistema (uma vez) |
| `npm run db:migrate` | Aplica as migrações e, se o schema mudou, cria uma nova |
| `npm run db:seed` | Insere os dados iniciais (pode rodar de novo, não duplica) |
| `npm run db:studio` | Abre o Prisma Studio: tela no navegador para ver e editar o banco |
| `npm run db:generate` | Gera o cliente TypeScript do Prisma (roda sozinho no `npm install`) |

**Rotas da API**

Todas as rotas, menos `/api/health` e `/api/auth/*`, exigem login. Sem login a resposta é **401**; com um perfil sem permissão, **403** (ver a tabela da seção 2.5).

| Método e rota | Descrição |
|---|---|
| `GET /api/health` | Verifica se a API está no ar |
| `POST /api/auth/login` | Corpo `{ email, senha }`: entra e grava o cookie de sessão (`httpOnly`) |
| `POST /api/auth/logout` | Sai (apaga o cookie) |
| `GET /api/auth/eu` | Quem está logado |
| `POST /api/auth/senha` | Corpo `{ senhaAtual, novaSenha }`: troca a própria senha |
| `GET /api/usuarios` | Lista os usuários (só Admin, sem hash de senha) |
| `POST /api/usuarios` | Corpo `{ nome, email, perfil, unidadeId, senhaProvisoria }`: cria usuário (só Admin) |
| `PATCH /api/usuarios/:id` | Altera `nome`, `email`, `perfil`, `unidadeId` ou `ativo` (só Admin) |
| `POST /api/usuarios/:id/senha` | Corpo `{ senhaProvisoria }`: redefine a senha (só Admin) |
| `GET /api/auditoria` | Últimas alterações, paginado (só Admin) |
| `GET /api/revisoes` | Fila de revisões com veículo, cliente, unidade e operadora (a operadora recebe só a carteira dela). Aceita `busca`, `unidade`, `operador` (id ou `sem`), `km`, `situacao`, `mesVenda` (AAAA-MM), `pagina` e `porPagina` (máximo 100) |
| `GET /api/revisoes/exportar` | Baixa a fila filtrada em CSV (mesmos filtros, até 20.000 linhas, sem CPF) |
| `PATCH /api/revisoes/atribuir` | Corpo `{ ids, operadorId }`: passa as revisões para uma operadora (`null` tira a operadora) |
| `POST /api/revisoes/distribuir` | Corpo `{ operadorIds, filtros }`: divide em partes iguais as revisões sem operadora do filtro |
| `GET /api/unidades` | Unidades (STI, ZDC, BRT) |
| `GET /api/operadoras` | Operadoras ativas (sem e-mail) |
| `GET /api/motivos` | Motivos de não agendamento, com a `acao` de cada um |
| `GET /api/revisoes/:id` | Tela do cliente: a revisão com o histórico de contatos |
| `POST /api/revisoes/:id/tentativas` | Registra uma ligação. Corpo `{ versao, conseguiuFalar, resultado, motivoId?, dataAgendada?, proximoContato?, observacoes? }`, datas em `AAAA-MM-DD` |
| `PATCH /api/revisoes/:id/concluir` | Corpo `{ versao, concluida }`: marca como feita na oficina ou reabre |

Dados inválidos respondem **400** no formato `{ "error": "...", "detalhes": { "campos": { ... } } }`. Quando outra pessoa alterou a revisão antes (versão diferente), a resposta é **409** com `detalhes.codigo = "VERSAO_DESATUALIZADA"`, e nada é gravado.

### Frontend (`apps/web`)

Com a API rodando, abra outro terminal:

```bash
cd apps/web
npm install
npm run dev
```

Abra <http://localhost:5173> e entre com um dos usuários de teste. O Dashboard deve mostrar **API ok**. O Vite encaminha as chamadas `/api` para a porta 3333, então tela e API ficam no mesmo endereço e o cookie de sessão funciona sem configuração extra.

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o frontend em modo desenvolvimento |
| `npm run build` | Confere os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Serve a versão de produção localmente |
| `npm run lint` | Verifica o código (oxlint) |

O tema fica em `src/styles/`: as cores da marca estão em `_variables.scss` e o layout em `_layout.scss`.

### ⚠️ Dados sensíveis
As planilhas em `Documentos/` têm **nome, CPF e celular de clientes reais**. A pasta está no `.gitignore` e **nunca** deve ir para o GitHub. Para desenvolver, use só os dados fictícios do seed (`apps/api/prisma/seed.ts`).

---

## 6. Plano de implantação
| Etapa | Descrição |
|---|---|
| 1. Levantamento | ✅ Planilhas analisadas ([regras de negócio](docs/regras-de-negocio.md)) |
| 2. Regras e dados | Responder as [perguntas em aberto](docs/regras-de-negocio.md#7-perguntas-para-a-equipe) com a equipe |
| 3. MVP | Importação, fila e registro de contatos |
| 4. Piloto | Testar com as operadoras em paralelo à planilha |
| 5. Implantação | Ajustes, treinamento e backup |
| 6. Evolução | Conclusão automática, fila de retorno, mais unidades |

---

## 7. Documentos de referência
- [CONTRIBUTING.md](CONTRIBUTING.md): como contribuir (padrões de código, commits, documentação e segurança dos dados)
- [docs/arquitetura.md](docs/arquitetura.md): como o sistema está organizado (pastas, camadas, padrões)
- [docs/regras-de-negocio.md](docs/regras-de-negocio.md): lógica extraída das planilhas
- [docs/apresentacao-proposta.pptx](docs/apresentacao-proposta.pptx): proposta apresentada à diretoria
- Identidade visual: <https://www.maranhaomotos.com.br/>
