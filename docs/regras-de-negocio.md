# Regras de negócio — como a operação funciona hoje

Documento montado a partir das planilhas reais da operação, que ficam na pasta `Documentos/` e **não vão para o Git**. Aqui só aparecem a estrutura e a lógica, sem nenhum dado de cliente. Os exemplos usam dados fictícios.

---

## 1. Visão geral do fluxo

```
┌──────────────────────────┐     ┌───────────────────────────┐
│ Relatório de REVISÕES    │     │ Relatório de OS           │
│ (Cloud, por data venda)  │     │ "ESPELHAMENTO" (Cloud)    │
│ Pessoa, CPF, Chassi,     │     │ Chassi, Tipo O.S.,        │
│ Modelo, KM da revisão…   │     │ Código Assist. Técnica    │
└────────────┬─────────────┘     └─────────────┬─────────────┘
             │        cruzamento por CHASSI     │
             └───────────────┬──────────────────┘
                             ▼
              Chassi já tem OS de revisão? ── sim ──► sai da lista
                             │ não
                             ▼
                 LISTA ELEGÍVEL (a ligar)
                             ▼
     Distribuída entre as operadoras (coluna "operador")
                             ▼
     Ligação/WhatsApp → registra resultado do contato
                             ▼
     Relatório mensal de PRODUÇÃO + CAUSAS de não agendamento
```

---

## 2. Arquivos de entrada (exportados do Cloud)

### 2.1 Lista de revisões (`LISTA DE REVISOES - OBTER KM.xlsx`)
Clientes com revisão prevista, filtrados por **mês de venda** da moto.

| Coluna | Exemplo fictício | Observação |
|---|---|---|
| Pessoa | MARIA EXEMPLO DA SILVA | Nome do cliente |
| CPF/CNPJ | 000.000.000-00 | Formatado com pontos |
| Data Venda | 2026-07-29 12:02:58 | Data e hora |
| Chassi | 9C2XX0000TR000000 | **17 caracteres. É a chave do cruzamento** |
| Modelo | CG 160 FAN | Texto livre do Cloud |
| Km | 1000 | Revisão alvo: 1000, 6000, 12000 ou 18000 |
| Cor | VERMELHA METÁLICA | |
| Celular | (98) 900000000 | Formato `(DD) número` |
| Município | SANTA INÊS | Às vezes vem com `/MA` no final, às vezes não |

### 2.2 Espelhamento de OS (`ESPELHAMENTO.xlsx`)
Ordens de serviço já abertas. Se o chassi está aqui, a revisão já foi feita.

| Coluna | Exemplo | Observação |
|---|---|---|
| Chassi | 9C2XX0000TR000000 | Chave do cruzamento |
| Tipo O.S. | 1ª REVISÃO EXPRESSO | Ver a tabela de tipos abaixo |
| Código Assistência Técnica | 1014528 | 6 códigos distintos (unidade ou concessionária?) |

**Tipos de OS encontrados:**

| Tipo O.S. | Revisão provável |
|---|---|
| 1ª REVISÃO EXPRESSO / PACOTE / – VOLANTE | 1000 km |
| 2ª REVISÃO EXPRESSO / PACOTE / – VOLANTE | 6000 km |
| REVISÃO PERIÓDICA / – VOLANTE | 12000 km ou mais |
| EXTERNO - PACOTE | A confirmar |

"VOLANTE" parece indicar atendimento feito fora da oficina (oficina volante).

---

## 3. Regra de elegibilidade

1. Normalizar o chassi: remover espaços e deixar em maiúsculas.
2. Um registro da lista de revisões é **elegível** se o chassi **não aparece** no espelhamento de OS.
3. Na amostra analisada, 8 dos 105 chassis da lista já tinham OS e seriam removidos.

> **A validar:** o cruzamento deve considerar só o chassi, ou também se o **tipo de OS corresponde ao KM** (ex.: uma OS de 1ª revisão não deveria tirar o cliente da lista de 6000 km)? E qual é o período do espelhamento?

### Quando cada revisão é trabalhada
Tempo real entre a **data da venda** e a **data do contato**, medido na planilha de acompanhamento:

| Revisão | Mediana | Faixa típica |
|---|---|---|
| 1000 km | ~5,5 meses | 4 a 6 meses após a venda |
| 6000 km | ~11 meses | 10 a 12 meses |
| 12000 km | ~18 meses | 17 a 18 meses |
| 18000 km | ~24 meses | 23 a 24 meses |

Um mesmo chassi volta à lista em revisões seguintes (ex.: 1000 → 6000 → 12000). Isso é normal.

---

## 4. Registro do contato (planilha "Revisões")

Cada linha é um **cliente + revisão alvo**, com as colunas do Cloud mais as colunas de trabalho:

| Coluna | Valores usados | Regra proposta no sistema |
|---|---|---|
| (operador) | Nome da operadora | Responsável. Hoje é digitado à mão, com variação de maiúsculas |
| Data Contato | data | Preenchida automaticamente ao salvar |
| Cons falar? | `sim` / `não` | Booleano, obrigatório |
| Agendou? | `sim` / `não` / `retornar` | Obrigatório |
| Motivo | lista abaixo | Obrigatório quando *Agendou* = `não` ou `retornar` |
| Data agendada | data | Obrigatória quando *Agendou* = `sim` |
| Status | `Concluída` / `Não Concluído` | Se a revisão foi efetivada na oficina |
| Observações | texto livre | Opcional |

### Motivos (lista oficial da planilha)
| Motivo | Normalmente com *Agendou* = | Ação no sistema |
|---|---|---|
| AGENDADO! | sim | Vira o estado "agendado", não é um motivo |
| RETORNAR DEPOIS | retornar | Programar novo contato |
| Km não atingida | não / retornar | Programar novo contato |
| Cont. ñ func.-BUSCAR | não | Contato não funciona, buscar outro telefone |
| Mec. de confiança | não | Encerra |
| Em abstenção | não | Encerra |
| Se desfez da moto (vendida/roubada/falecido) | não | Encerra |
| Moto Revenda (em nome de terceiros) | não | Encerra |
| Sem cond financeira | não | Encerra (ou retorno futuro?) |
| Muito distante | não | Encerra |
| Realiza em outra autorizada | não | Encerra |
| Acha caro e serviço simples | não | Encerra |

### Combinações mais frequentes (amostra de cerca de 7.300 linhas)
| Cons falar? | Agendou? | Motivo | Status | % aprox. |
|---|---|---|---|---|
| não | retornar | RETORNAR DEPOIS | Não Concluído | 25% |
| sim | sim | AGENDADO! | Concluída | 22% |
| sim | retornar | RETORNAR DEPOIS | Não Concluído | 9% |
| sim | não | Mec. de confiança | Não Concluído | 6% |
| sim | sim | AGENDADO! | Não Concluído | 5% (agendou e não compareceu) |
| não | não | Cont. ñ func.-BUSCAR | Não Concluído | 5% |

### Problemas de qualidade vistos na planilha (o sistema deve evitar)
- Nomes de operadoras e valores digitados com variação de maiúsculas (`sim`/`SIM`, `não`/`NÃO`). **Solução:** listas fixas.
- Município ora com `/MA`, ora sem. **Solução:** normalizar na importação.
- Datas inválidas na coluna "Data agendada" (ex.: `19/202/`) e o texto "pendente" no lugar de data. **Solução:** campo de data validado.
- Combinações incoerentes (ex.: *Agendou* = `sim` com motivo "RETORNAR DEPOIS"). **Solução:** validação condicional.
- O mesmo chassi com a mesma revisão aparece em várias linhas (cerca de 1.700 casos). Provavelmente são novas tentativas em linhas novas. **Solução:** um registro por cliente + revisão, com várias **tentativas de contato** no histórico.
- Abas antigas e fórmulas quebradas (`#REF!`). **Solução:** relatórios calculados pelo sistema.

---

## 5. Indicadores (relatório mensal de produção)

Planilha `Produção equipe pós venda oficina - <mês>.xlsx`, montada por **operadora × unidade**.

**Unidades:** `STI` (Santa Inês), `ZDC` (Zé Doca), `BRT`/`BU` (Buriticupu). Uma aba antiga também cita Crateús.

**Por operadora e unidade, no mês:**
- Total de clientes
- Conseguiu falar / Não conseguiu falar
- Agendados
- Concluídos

**Rankings calculados:**
| Indicador | Fórmula |
|---|---|
| % sucesso no contato | conseguiu falar ÷ total de clientes |
| % sucesso no agendamento | agendados ÷ conseguiu falar |
| % conclusão sobre agendados | concluídos ÷ agendados |
| % concluídos da base (por unidade) | concluídos ÷ total de clientes |

Também há um bloco "agendados no mês X, concluídos no mês X+1": a conclusão costuma cair no mês seguinte ao agendamento.

**Aba de causas:** contagem dos motivos de "consegui falar e não agendei" por operadora × unidade, com total geral e %.

> No sistema, todos esses números saem direto do banco, com filtro de mês, unidade e operadora.

---

## 6. Oportunidades para o sistema
1. **Conclusão automática:** cruzar o espelhamento do mês seguinte com os agendados para marcar `Concluída` sem digitação.
2. **Fila de retorno:** quem ficou como "retornar" ou "Km não atingida" volta para a fila numa data programada.
3. **Buscar contato:** fila separada para "Cont. ñ func.-BUSCAR".
4. **Unidade automática** pelo município do cliente, a validar.

---

## 7. Perguntas para a equipe
- [ ] O cruzamento é só por chassi ou também precisa bater o tipo de OS com o KM?
- [ ] Qual é o período do espelhamento usado em cada importação?
- [ ] O que significa cada **Código Assistência Técnica**? Quais são da Maranhão Motos?
- [ ] O que é "EXTERNO - PACOTE"?
- [ ] Como a unidade (STI, ZDC, BRT) é definida: pelo município, pela loja da venda ou outro critério?
- [ ] "Sem cond financeira" e "Em abstenção" encerram o cliente ou viram retorno futuro? (Hoje estão como **encerrar** no seed; mudar é só trocar a `acao` do motivo.)
- [ ] Na Etapa 8, o sistema só aceita "Agendou = sim" quando "Conseguiu falar = sim". Existe agendamento sem falar com o cliente (ex.: resposta por WhatsApp registrada depois)?
- [ ] Depois de quantas tentativas sem sucesso o cliente sai da fila?
- [ ] (Etapa 9) O **Gestor** vê todas as unidades ou só a dele? Hoje vê todas.
- [ ] (Etapa 9) A **operadora** pode marcar a revisão como concluída, ou só o Gestor? Hoje ela pode, na própria carteira, e fica na auditoria.
- [ ] (Etapa 9) Ao **desativar** uma operadora, as revisões abertas dela voltam para "sem operadora". Está certo, ou devem ir direto para outra pessoa?
- [ ] (Etapa 9) Login de 10 horas e senha de 8+ caracteres com letras e números atendem à TI da empresa?
- [ ] A lista de revisões é gerada uma vez por mês? Com qual filtro de data de venda?
