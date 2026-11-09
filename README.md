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

---

## 3. Modelo de dados (rascunho)

```
unidades          (id, sigla [STI|ZDC|BRT], nome)
usuarios          (id, nome, email, senha_hash, perfil, unidade_id, ativo)
importacoes       (id, usuario_id, tipo [revisoes|os], arquivo, periodo_ref,
                   total_linhas, total_validos, total_invalidos, status, criado_em)
clientes          (id, nome, cpf_cnpj, celular, municipio)
veiculos          (id, chassi UNIQUE, modelo, cor, data_venda, cliente_id)
ordens_servico    (id, chassi, tipo_os, codigo_assistencia, importacao_id)
revisoes_alvo     (id, veiculo_id, km [1000|6000|12000|18000], importacao_id,
                   unidade_id, operador_id, situacao, proximo_contato,
                   concluida, versao, UNIQUE(veiculo_id, km))
tentativas_contato(id, revisao_alvo_id, usuario_id, data_contato, conseguiu_falar,
                   agendou [sim|nao|retornar], motivo_id, data_agendada, observacoes)
motivos           (id, descricao, encerra_cliente BOOLEAN, ativo)
auditoria         (id, usuario_id, entidade, entidade_id, acao, antes, depois, criado_em)
```

**Situação de `revisoes_alvo`:** `pendente` → `retornar` | `agendado` | `nao_agendado` | `buscar_contato` → `concluida`.

A coluna `versao` permite *optimistic locking*: uma gravação feita sobre uma versão antiga é bloqueada e o usuário é avisado.

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

Pré-requisitos: Node.js 20+, Git e PostgreSQL 15+ (ou Supabase). O passo a passo completo está no [ROTEIRO.md](ROTEIRO.md).

> Os comandos `npm install` e `npm run dev` e as variáveis de ambiente serão documentados aqui assim que os apps forem criados.

### ⚠️ Dados sensíveis
As planilhas em `Documentos/` têm **nome, CPF e celular de clientes reais**. A pasta está no `.gitignore` e **nunca** deve ir para o GitHub. Para desenvolver, use só dados fictícios em `db/seed/`.

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
- [docs/regras-de-negocio.md](docs/regras-de-negocio.md): lógica extraída das planilhas
- [docs/apresentacao-proposta.pptx](docs/apresentacao-proposta.pptx): proposta apresentada à diretoria
- Identidade visual: <https://www.maranhaomotos.com.br/>
