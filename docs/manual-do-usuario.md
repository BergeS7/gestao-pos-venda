# Manual do usuário — RevisOn

Guia para quem usa o sistema no dia a dia do pós-venda da oficina. Cada perfil tem a sua seção; comece pela **seção 1**, que vale para todos.

> Os exemplos usam dados fictícios. Os nomes dos botões e menus são os que aparecem na tela.

| Perfil | Leia |
|---|---|
| Operadora | Seções 1, 2 e 6 |
| Gestor de Pós-Venda | Seções 1, 2, 3 e 6 |
| Diretoria | Seções 1, 4 e 6 |
| Administrador | Todas, principalmente a 5 |

---

## 1. Para todos

### Entrar
1. Abra o endereço do sistema que a TI informou.
2. Digite seu **e-mail** e sua **senha** e clique em **Entrar**.
3. No **primeiro acesso**, o sistema pede para trocar a senha provisória que o Admin passou. A nova senha precisa de **pelo menos 8 caracteres, com letras e números**.

**Errou a senha 5 vezes?** O login fica bloqueado por 15 minutos. **Esqueceu a senha?** Peça ao Admin para redefinir (ele passa uma provisória e você troca no próximo acesso).

### A tela
- **Menu à esquerda:** as páginas que o seu perfil pode usar. No celular, o menu abre pelo botão ☰.
- **No alto, à direita:** seu nome, o botão de **trocar senha** (ícone de chave) e **Sair**.
- O login vale por um turno de trabalho (10 horas). Depois disso, o sistema pede para entrar de novo, e você volta para a página onde estava.

### Situações de uma revisão
| Situação | Quer dizer |
|---|---|
| **Pendente** | Ninguém ligou ainda |
| **Retornar** | Ligar de novo na data marcada (pediu para retornar, km não atingida...) |
| **Agendado** | O cliente marcou a revisão |
| **Não agendado** | Falou e não quis (mecânico de confiança, muito distante...). Sai da fila |
| **Buscar contato** | O telefone não funciona: procurar outro número |
| **Concluída** | A revisão foi feita na oficina |

### Cuidados com os dados dos clientes (LGPD)
- Os dados são só para o contato de pós-venda. Não copie para planilhas pessoais nem mande para outras pessoas.
- O sistema **registra** quem abre a tela de cada cliente e quem exporta a fila.
- Nas **observações** das ligações, escreva só o necessário para o atendimento (nada de saúde, religião ou outros documentos).
- Se um cliente pedir para **saber quais dados** temos dele ou para **não receber mais contato / apagar os dados**, avise o Admin (seção 5).

---

## 2. Operadora: o trabalho do dia

### 2.1 Agenda do dia (comece por aqui)
Menu **Agenda do dia**. Mostra o que fazer hoje, em blocos:

| Bloco | O que fazer |
|---|---|
| **Ligar hoje** | Retornos marcados para hoje e os atrasados (os mais atrasados primeiro) |
| **Vêm hoje à oficina** | Clientes agendados para hoje. Quando a revisão for feita, marque como concluída |
| **Agendados que ainda não vieram** | A data já passou: confira se veio (concluir) ou ligue para remarcar |
| **Buscar contato** | O telefone não funciona: procure outro número |
| **Ainda sem contato** | Ninguém ligou ainda |

Os números no alto levam direto a cada bloco. Em cada cliente há atalhos para **ligar**, abrir o **WhatsApp** e abrir a **tela do cliente**.

### 2.2 Registrar uma ligação
Na tela do cliente (clique no nome, na agenda ou na fila), no bloco **Registrar contato**:

1. **Conseguiu falar?** Sim ou Não.
2. **Agendou?**
   - **Sim:** informe a **data agendada**.
   - **Não:** escolha o **motivo**. Alguns motivos encerram (ex.: "Mecânico de confiança"); outros pedem a data do **próximo contato** (ex.: "Km não atingida").
   - **Retornar:** escolha o motivo e a data do **próximo contato**.
3. **Observações** (opcional) e **Salvar contato**.

A ligação entra no **histórico**, logo abaixo. Não se apaga nem se edita, como uma linha nova na planilha, só que organizado.

**Apareceu "Outra pessoa alterou esta revisão"?** Alguém (o gestor, por exemplo) mexeu nela enquanto você preenchia. Nada foi gravado: recarregue a página, veja o que mudou e registre de novo se ainda fizer sentido.

### 2.3 Revisão feita na oficina
Na tela do cliente, clique em **Marcar como concluída**. Se marcou por engano, **Reabrir revisão** volta para a situação do último contato.

> Quando o Gestor importa o espelhamento de OS, o sistema conclui sozinho as revisões que já têm OS do mesmo km.

### 2.4 Minha carteira
Menu **Fila de revisões** (para você aparece como **Minha carteira**): todos os seus clientes, com filtros por situação, revisão (km), mês de venda e busca por nome, chassi ou celular. **Exportar** baixa a lista em CSV, que abre no Excel (sem CPF).

### 2.5 Dashboard
Mostra os **seus** números do mês: clientes trabalhados, conseguiu falar, agendados e concluídos, e as causas de não agendamento.

---

## 3. Gestor: importar, distribuir e acompanhar

### 3.1 Importar os relatórios do Cloud (todo mês)
Menu **Importações**. Exporte do Cloud, como sempre, a **lista de revisões** ("LISTA DE REVISOES - OBTER KM") e o **espelhamento de OS** ("ESPELHAMENTO"), em .xlsx ou .csv. Não precisa arrumar nada no Excel.

1. **Arquivos:** escolha os dois arquivos (ou só o espelhamento, para concluir revisões) e clique em **Ler arquivos**. *Nada é gravado ainda.*
   - A opção **"Só tirar da lista quando o tipo da OS corresponder ao km"** vem desmarcada, igual à planilha de hoje: qualquer OS do chassi tira o cliente da lista.
2. **Validação:** quantas linhas foram lidas, **recusadas** (com o número da linha no arquivo e o motivo), repetidas e quantas já estavam na fila.
3. **Cruzamento:** quem **já fez** a revisão (tem OS, sai da lista), quem é **elegível** (vai para a fila) e as revisões abertas que serão **concluídas** pelo espelhamento. Fique de olho em **"Sem unidade"**: são municípios que o sistema ainda não sabe a qual unidade pertencem.
4. **Confirmação:** confira o resumo e clique em **Confirmar importação**. Para desistir, **Cancelar importação**.

Depois de confirmar, as revisões entram na fila como **Pendente, sem operadora**. Use **Distribuir na fila**.

> Se fechar a página no meio, a prévia fica no **Histórico de importações** com o botão **Continuar** (por até 24 horas).

### 3.2 Distribuir a fila
Menu **Fila de revisões**:
- **Distribuir:** divide as revisões **sem operadora** (dos filtros escolhidos) em partes iguais entre as operadoras que você marcar.
- **Atribuir a:** marque revisões na tabela e escolha a operadora para passar só essas.
- Filtros por unidade, operadora (inclusive "Sem operadora"), revisão, situação e mês de venda.

Gestor também pode registrar ligações e concluir revisões de qualquer carteira (para cobrir uma operadora, por exemplo).

### 3.3 Dashboard e relatório do mês
Menu **Dashboard**: os números da equipe no mês, por operadora e unidade, com as taxas de contato, agendamento e conclusão e as causas de não agendamento. **Exportar Excel** baixa o relatório de produção, no formato da planilha mensal, só com números (sem dados de clientes).

Como cada número é contado: [regras-de-negocio.md, seção 5.1](regras-de-negocio.md#51-como-o-sistema-conta-o-mês-etapa-10).

---

## 4. Diretoria
- **Dashboard:** números do mês da equipe toda, com filtros de mês, unidade e operadora, e **Exportar Excel**.
- **Fila de revisões** e **Agenda do dia:** consulta de tudo, sem alterar.

A diretoria não registra ligações nem distribui a fila.

---

## 5. Administrador

### 5.1 Usuários
Menu **Usuários**, aba **Equipe**:
- **Novo usuário:** nome, e-mail, perfil e unidade. O sistema sugere uma **senha provisória**; passe para a pessoa (de preferência pessoalmente). Ela troca no primeiro acesso.
- **Redefinir senha:** para quem esqueceu.
- **Desativar:** para quem saiu da equipe. A pessoa perde o acesso na hora, continua no histórico, e as revisões abertas dela voltam para "sem operadora" (redistribua). Ninguém é apagado.
- O sistema não deixa ficar sem nenhum Admin ativo.

Aba **Auditoria:** quem fez o quê e quando (logins, ligações, conclusões, distribuições, importações, exportações, quem abriu dados de clientes, anonimizações).

### 5.2 Privacidade (LGPD): pedidos dos clientes
Menu **Privacidade (LGPD)**. Antes de qualquer coisa, **confirme a identidade** de quem pede.

- **O cliente quer saber o que temos dele:** busque pelo CPF (ou nome), clique em **Ver dados** e em **Baixar dados (arquivo)**. Responda em até 15 dias.
- **O cliente quer que os dados sejam apagados:** na mesma tela, digite `ANONIMIZAR` e clique em **Anonimizar**. O nome vira "CLIENTE ANONIMIZADO", CPF, celular e observações são apagados e as revisões saem da fila. **Não tem volta.** As ligações continuam contando nos relatórios, sem identificar o cliente.

Procedimento completo, prazo de guarda e decisões pendentes da empresa: [lgpd.md](lgpd.md).

### 5.3 Rotinas técnicas
Backup, restauração, publicação e prazo de guarda: [implantacao.md](implantacao.md) e [lgpd.md](lgpd.md), seção 5. Normalmente quem cuida é a TI.

---

## 6. Dúvidas frequentes

**Liguei e o cliente pediu para retornar daqui a um mês. O que marco?**
Agendou? = **Retornar**, motivo "Retornar depois" e a data do próximo contato. Ele volta na sua **Agenda do dia** nessa data.

**O cliente agendou por WhatsApp, sem ligação.**
Hoje o sistema só aceita "Agendou = Sim" com "Conseguiu falar = Sim". Marque **Sim** em "Conseguiu falar" e explique nas observações. (Pergunta em aberto com a equipe.)

**O telefone não existe.**
Agendou? = **Não**, motivo "Contato não funciona (buscar)". O cliente vai para o bloco **Buscar contato**.

**Um cliente apareceu duas vezes na fila.**
Se for a mesma moto e a mesma revisão, não deveria acontecer (o sistema não deixa). Se for a mesma moto com revisões diferentes (1.000 e 6.000 km, por exemplo), é normal. Se for outra moto do mesmo cliente, também é normal.

**Importei e um cliente que já fez a revisão continuou na lista.**
O espelhamento enviado pode não ter a OS dele (confira o período exportado do Cloud). Quando a OS aparecer num espelhamento, a revisão é concluída sozinha.

**A tela mostra "Sua sessão expirou".**
Passaram as 10 horas do login (ou a senha foi trocada). Entre de novo; você volta para a mesma página.
