# LGPD — Dados pessoais no RevisOn

Como o sistema trata os dados pessoais dos clientes, o que já está implementado e o que **a empresa precisa decidir**. A Lei Geral de Proteção de Dados (Lei 13.709/2018) vale para qualquer empresa que guarda dados de pessoas, e a Maranhão Motos é a **controladora** desses dados.

> Este documento é técnico e não substitui orientação jurídica. As decisões marcadas com ⚠️ precisam ser tomadas pela diretoria, de preferência com o jurídico ou o encarregado de dados (DPO).

---

## 1. Quais dados pessoais o sistema guarda

| Dado | Onde | Para quê | Quem vê na tela |
|---|---|---|---|
| Nome do cliente | `clientes.nome` | Identificar quem ligar | Operadora (só a carteira dela), Gestor, Diretoria, Admin |
| Celular | `clientes.celular` | Ligar e mandar WhatsApp sobre a revisão | Os mesmos |
| Município | `clientes.municipio` | Definir a unidade que atende | Os mesmos |
| CPF/CNPJ | `clientes.cpf_cnpj` | Juntar as motos do mesmo cliente na importação | **Ninguém** nas telas do dia a dia. Só o Admin, na tela de Privacidade |
| Moto (chassi, modelo, cor, data da venda) | `veiculos` | Saber qual revisão cabe e cruzar com as ordens de serviço | Os mesmos do nome |
| Histórico de ligações e observações | `tentativas_contato` | Acompanhar o atendimento e montar o relatório de produção | Os mesmos do nome |

Os dados vêm dos relatórios exportados do sistema Cloud da concessionária, os mesmos que a equipe já usa nas planilhas.

**Base legal (⚠️ confirmar com o jurídico):** o contato de pós-venda sobre revisões da moto comprada costuma se apoiar no **legítimo interesse** (art. 7º, IX) e na **execução do contrato** de compra e garantia (art. 7º, V). Mensagens de marketing que não tratam da revisão podem exigir consentimento.

## 2. O que já está implementado

| Medida | Como |
|---|---|
| Acesso só com login | Toda rota com dados exige sessão; senha com hash bcrypt; bloqueio após 5 erros |
| Mínimo necessário por perfil | A operadora vê só a carteira dela (a API garante). A diretoria só olha, não altera |
| CPF fora das telas | A fila, a tela do cliente, a agenda e o CSV exportado **não** trazem CPF. Na busca da Privacidade ele aparece mascarado (`***.456.789-**`) |
| Registro de acessos | A auditoria guarda quem **abriu a tela de um cliente** (`CLIENTE_VISUALIZADO`), quem **exportou a fila** e com quais filtros (`FILA_EXPORTADA`), quem consultou os dados de um titular e quem anonimizou. Aba Auditoria, em Usuários |
| Aviso no login | "Acesso restrito à equipe. Os dados dos clientes são protegidos pela LGPD e os acessos ficam registrados." |
| Pedido de acesso do titular | Tela **Privacidade (LGPD)** (só Admin): buscar o cliente, ver tudo o que está guardado e baixar em arquivo |
| Pedido de exclusão do titular | Na mesma tela: **Anonimizar** (ver seção 4) |
| Prazo de guarda | Script `npm run db:retencao` (ver seção 5) |
| Transporte e cabeçalhos | HTTPS em produção (cookie `secure`), `helmet` com política de conteúdo, cookie `httpOnly` e `SameSite=Strict` |
| Dados reais fora do código | Planilhas reais (`Documentos/`) e backups (`backups/`) nunca vão para o Git. Testes e exemplos só usam dados fictícios |

## 3. Pedido de acesso (o cliente quer saber o que temos dele)

1. Confirme a identidade de quem pede (por exemplo, documento com foto na loja, ou contato pelo celular cadastrado).
2. O Admin abre **Privacidade (LGPD)**, busca pelo CPF e clica em **Ver dados**.
3. **Baixar dados (arquivo)** gera um `.json` com tudo: cadastro, motos, revisões e ligações. Para entregar ao cliente, pode-se imprimir a tela ou converter o arquivo num documento simples.
4. A consulta fica na auditoria (`DADOS_TITULAR_CONSULTADOS`).

Prazo legal de resposta: em formato simplificado, imediatamente; a declaração completa, em até **15 dias** (art. 19).

## 4. Pedido de exclusão (o cliente não quer mais contato / quer ser esquecido)

Na tela de Privacidade, o Admin digita `ANONIMIZAR` e confirma. Numa única operação, o sistema:

- troca o nome por `CLIENTE ANONIMIZADO <número>`;
- apaga o CPF/CNPJ, o celular e as observações escritas nas ligações;
- tira da fila as revisões ainda abertas (viram "Não agendado", sem datas).

**Ficam:** município, dados da moto e as ligações sem observação. Motivo: as ligações já contam no relatório de produção das operadoras; apagar as linhas mudaria relatórios de meses passados. Sem nome, CPF e celular, o que sobra não identifica a pessoa sozinho.

**Não tem volta.** Fica registrado na auditoria (`CLIENTE_ANONIMIZADO`, com o motivo `PEDIDO_DO_TITULAR`).

⚠️ **Backups:** os backups antigos ainda têm os dados até serem apagados pela rotina (30 dias, ver [implantacao.md](implantacao.md)). Se um backup for restaurado, anonimize de novo os clientes da lista de pedidos atendidos (a auditoria mostra quais).

⚠️ **Nova importação:** se o mesmo cliente comprar **outra** moto, ele volta a aparecer pelos dados novos do Cloud. A importação **não** preenche de novo os dados de um cliente anonimizado pelo chassi antigo (ver `services/importacao.ts`).

## 5. Prazo de guarda

Dados pessoais não devem ficar guardados para sempre (art. 15 e 16). O script abaixo anonimiza os clientes **sem nenhuma revisão aberta** e **sem nenhuma movimentação** (revisão alterada ou ligação registrada) há mais de N meses:

```bash
cd apps/api
npm run db:retencao                    # só mostra quantos e quais seriam afetados
npm run db:retencao -- --aplicar       # anonimiza de verdade (faça um backup antes)
npm run db:retencao -- --meses 36      # outro prazo
```

⚠️ **O prazo é decisão da empresa.** O padrão do script é **60 meses (5 anos)**, contado da última movimentação, só como ponto de partida: cobre as 4 revisões (até 18.000 km, cerca de 2 anos após a venda) com folga. Depois de decidido, sugere-se rodar uma vez por mês, logo após o backup, e guardar a saída do comando.

## 6. Decisões pendentes da empresa

- [ ] ⚠️ Confirmar a base legal do contato de pós-venda (seção 1)
- [ ] ⚠️ Definir o prazo de guarda e quem roda o `db:retencao` (seção 5)
- [ ] ⚠️ Indicar o encarregado de dados (DPO) e o canal para os clientes fazerem pedidos
- [ ] ⚠️ Se a hospedagem for num serviço externo, conferir no contrato onde ficam os dados e as obrigações do provedor ([implantacao.md](implantacao.md), seção 2)
- [ ] ⚠️ Combinar com a equipe que as observações das ligações não devem ter dados desnecessários (saúde, religião, outros números de documento)

## 7. Incidente (vazamento, acesso indevido)

1. Troque as senhas envolvidas e, se preciso, a `JWT_SECRET` (desconecta todo mundo).
2. Use a auditoria para ver quem acessou o quê e quando.
3. Avise a diretoria e o encarregado de dados. A comunicação à ANPD e aos clientes afetados, quando houver risco relevante, deve ser feita em prazo razoável (Resolução CD/ANPD nº 15/2024: 3 dias úteis).
