# Gestão do Pós-Venda — Maranhão Motos

Sistema web para organizar a **carteira de clientes do pós-venda da oficina** da Maranhão Motos. Ele substitui a planilha compartilhada e o cruzamento manual de relatórios por uma base central, com histórico de atendimentos e indicadores para a gestão.

> **Status:** em proposta de desenvolvimento. Ainda não existe código neste repositório. Este README resume a proposta aprovada para levantamento e serve como ponto de partida para o desenvolvimento.

---

## 1. Contexto

### Como funciona hoje

1. A equipe exporta do **Cloud** (sistema atual) dois relatórios: **clientes** e **ordens de serviço (OS)**.
2. No Excel, compara as duas bases e **retira da lista os clientes que já têm OS** no período.
3. O que sobra é a **carteira elegível** para ações de pós-venda (revisão, manutenção etc.).
4. Os colaboradores registram contatos e atualizações **no mesmo arquivo compartilhado** (Drive).
5. A gestão consolida os resultados manualmente.

### Problemas relatados

| Problema | Impacto |
|---|---|
| Edição simultânea na planilha | Alterações de colaboradores entram em conflito |
| Falhas de sincronização no Drive | Risco de perda ou sobrescrita de dados |
| Cruzamento manual clientes × OS | Retrabalho e divergências |
| Controle disperso | Pouca rastreabilidade e visão gerencial limitada |

### Como será com o sistema

```
Cloud ──(exporta Excel/CSV)──► Importação ──► Validação ──► Cruzamento clientes × OS
                                                                  │
                                                                  ▼
            Indicadores ◄── Registro de contatos ◄── Distribuição ◄── Carteira elegível
```

- A equipe **continua exportando os relatórios do Cloud**. O sistema assume o tratamento dos dados.
- Registros com inconsistência vão para **revisão antes da confirmação** da importação.
- **Versão 1 sem integração direta por API com o Cloud.** O Cloud continua sendo a origem dos arquivos.

---

## 2. Escopo do MVP

As telas abaixo vêm do protótipo conceitual da apresentação. Campos e números são ilustrativos e dependem da validação dos requisitos.

### 2.1 Importações
- Upload de dois arquivos: **relatório de clientes** e **relatório de OS** (CSV ou XLSX).
- Fluxo em 4 etapas: **Arquivos → Validação → Cruzamento → Confirmação**.
- Resultado: clientes válidos, clientes com OS, clientes **elegíveis**.
- Indicadores de qualidade: **duplicidades** e **inconsistências para revisão**.
- Prévia dos registros com situação `Elegível`, `Com OS` ou `Revisar`.
- **Histórico de importações**: data/hora, arquivos, resultado e totais.

### 2.2 Carteira de clientes
- Lista com: cliente, telefone, veículo, identificador, responsável, situação, categoria, último contato e próximo contato.
- Busca por nome, telefone ou identificador. Filtros por situação e responsável.
- Ações: visualizar, editar e **exportar**.
- Distribuição da carteira entre colaboradores.

### 2.3 Atendimentos
- Cabeçalho do cliente: registro, veículo, telefone (mascarado) e responsável.
- **Histórico de interações** em linha do tempo (ligação, WhatsApp, retorno programado).
- Registro do resultado:
  - Situação, descrição do resultado (obrigatória)
  - Agendamento: sim/não
  - **Motivo do não agendamento** (lista pré-definida)
  - Observações e **data do próximo contato**
- Ações: **Salvar**, **Finalizar atendimento**, **Reabrir**.

### 2.4 Dashboard
- Filtros por período e unidade.
- Cards: total importado, elegíveis, pendentes, em atendimento, agendados, não agendados.
- Gráficos: atendimentos por período, produtividade por colaborador, distribuição de resultados.
- Contagem de **retornos programados**.

### 2.5 Usuários e permissões

| Perfil | Pode |
|---|---|
| **Colaborador** | Atender a carteira atribuída e atualizar registros autorizados |
| **Gestor de Pós-Venda** | Distribuir carteira, supervisionar equipe, consultar relatórios |
| **Diretoria** | Ver indicadores estratégicos e resultados consolidados |
| **Administrador / TI** | Configurar acessos, permissões, auditoria e recuperação |

**Controles obrigatórios:** login individual, registro de autor e data/hora de cada alteração, proteção contra sobrescrita (edição concorrente), backup e exportação.

---

## 3. Modelo de dados (rascunho)

Ponto de partida para discussão. As chaves de cruzamento ainda precisam ser validadas com a equipe.

```
usuarios        (id, nome, email, perfil, ativo, criado_em)
unidades        (id, nome)
importacoes     (id, usuario_id, arquivo_clientes, arquivo_os, status,
                 total_validos, total_com_os, total_elegiveis,
                 total_duplicados, total_inconsistentes, criado_em)
clientes        (id, identificador_cloud, nome, telefone, veiculo, unidade_id,
                 importacao_id, criado_em, atualizado_em)
ordens_servico  (id, numero_os, cliente_identificador, data_abertura, importacao_id)
carteira        (id, cliente_id, importacao_id, responsavel_id, situacao,
                 categoria, ultimo_contato, proximo_contato, versao)
atendimentos    (id, carteira_id, usuario_id, tipo_contato, resultado,
                 agendou, motivo_nao_agendamento_id, observacoes,
                 proximo_contato, criado_em)
motivos_nao_agendamento (id, descricao, ativo)
auditoria       (id, usuario_id, entidade, entidade_id, acao,
                 dados_antes, dados_depois, criado_em)
```

**Situações da carteira:** `pendente` → `em_atendimento` → `agendado` | `nao_agendado`, com possibilidade de **retorno programado** e **reabertura**.

**Concorrência:** a coluna `versao` permite *optimistic locking*. Uma gravação feita sobre uma versão antiga é rejeitada e o usuário é avisado, em vez de sobrescrever o trabalho de outro colaborador.

---

## 4. Arquitetura e stack proposta

> Referência técnica, sujeita à validação da Gestão de TI (hospedagem, retenção, recuperação, serviço gerenciado × infraestrutura própria).

| Camada | Tecnologia |
|---|---|
| Interface | **React + TypeScript** |
| API própria | **Node.js** (TypeScript) |
| Banco de dados | **PostgreSQL** (Supabase como opção de serviço gerenciado) |
| Leitura de planilhas | Biblioteca de parsing de CSV/XLSX no backend |
| Infraestrutura | Hospedagem web, com backup e rotina de recuperação |

```
Cloud ─► Excel/CSV ─► [Sistema web (React)] ─► [API (Node.js)] ─► [PostgreSQL]
                              ▲
                     Equipe e gestão
```

### Estrutura de pastas sugerida

```
gestao-pos-venda/
├── apps/
│   ├── web/          # Frontend React + TypeScript
│   └── api/          # Backend Node.js + TypeScript
├── packages/
│   └── shared/       # Tipos e validações compartilhados (ex.: schemas)
├── db/
│   ├── migrations/   # Migrações do PostgreSQL
│   └── seed/         # Dados fictícios para desenvolvimento
├── docs/             # Apresentação, requisitos, regras de negócio
└── README.md
```

---

## 5. Começando a desenvolver

### Pré-requisitos
- [Node.js](https://nodejs.org/) 20 ou superior
- [Git](https://git-scm.com/)
- PostgreSQL 15 ou superior (local, Docker ou um projeto Supabase)

### Clonar

```bash
git clone https://github.com/BergeS7/gestao-pos-venda.git
cd gestao-pos-venda
```

### Primeiros passos sugeridos

1. Criar a estrutura `apps/web` e `apps/api` (por exemplo com Vite para o frontend).
2. Criar as migrações do modelo de dados da seção 3.
3. Pedir à equipe **exemplos reais (anonimizados)** dos relatórios exportados do Cloud.
4. Implementar a **importação + cruzamento** primeiro: é o coração do sistema.
5. Depois, carteira → atendimentos → dashboard → permissões e auditoria.

> Os comandos de instalação e execução (`npm install`, `npm run dev`, variáveis de ambiente) serão documentados aqui assim que o projeto for criado.

### Dados sensíveis
- **Nunca** versionar relatórios reais do Cloud nem dados de clientes. Use somente dados fictícios em `db/seed/`.
- Manter credenciais em `.env` (fora do Git), com um `.env.example` versionado.

---

## 6. Plano de implantação

| Etapa | Descrição |
|---|---|
| 1. Levantamento | Analisar planilhas e relatórios com a equipe |
| 2. Regras e dados | Validar chaves de cruzamento, regras de elegibilidade e permissões |
| 3. MVP | Importação, carteira e atendimentos |
| 4. Piloto | Testar fluxos, concorrência e resultados com a oficina |
| 5. Implantação | Ajustes, treinamento e validação da recuperação |
| 6. Evolução contínua | Melhorias priorizadas com dados de uso |

Prazos, orçamento e responsáveis serão definidos após o levantamento.

**Métricas a avaliar no piloto:** tempo de preparação da carteira, número de inconsistências, pendências e conversão em agendamento.

---

## 7. Questões em aberto

- [ ] Quais colunas exatas os relatórios de clientes e OS do Cloud trazem?
- [ ] Qual é a **chave de cruzamento** entre cliente e OS (CPF, código do cliente, placa/chassi)?
- [ ] Qual é o **período** considerado para dizer que um cliente "tem OS"?
- [ ] Regras de elegibilidade por categoria (revisão, manutenção, diagnóstico etc.)
- [ ] Lista oficial de **motivos de não agendamento**
- [ ] Quantas unidades e quantos colaboradores vão usar o sistema?
- [ ] Hospedagem: serviço gerenciado (Supabase) ou infraestrutura própria?
- [ ] Política de retenção de dados e LGPD

---

## 8. Documentos de referência

- `APRESENTAÇÃO` — apresentação da proposta (arquivo PowerPoint, sem extensão)
- `Pos_Venda_Clean_WhatsApp.pdf` — versão em PDF da apresentação
- Identidade visual de referência: <https://www.maranhaomotos.com.br/>

> As telas e números da apresentação são **protótipos ilustrativos com dados fictícios**. Não representam resultados reais da operação.
