# db/seed — Arquivos FICTÍCIOS para testar a importação (Etapa 6)

Versões inventadas dos dois relatórios do Cloud, com as **mesmas colunas** dos reais
(docs/regras-de-negocio.md, seção 2). Nenhum nome, CPF, celular ou chassi é real.

| Arquivo | O que testa |
|---|---|
| `lista-revisoes-exemplo.csv` | Lista de revisões, separador `;`, com uma linha de título acima do cabeçalho |
| `espelhamento-exemplo.csv` | Espelhamento de OS, separador `,` |

Dá para enviar os dois na tela **Importações** (com o banco de desenvolvimento do seed).
Os testes automáticos usam os mesmos arquivos (`apps/api/src/services/importacao/cruzamento.test.ts`
e `apps/api/src/routes/rotas.test.ts`).

**Resultado esperado** (cruzamento só por chassi, o padrão):

| Lista de revisões | Linhas | Por quê |
|---|---|---|
| Lidas | 15 | |
| Inválidas | 3 | chassi com 16 caracteres, km 5000, sem nome |
| Duplicadas | 1 | a 1ª linha repetida (mesmo chassi + km) |
| Já na fila | 1 | `9C2TST0000T000001`, 6000 km, já existe no seed |
| Com OS (já fizeram) | 3 | chassis `…00103`, `…00104`, `…00105` têm OS no espelhamento |
| **Elegíveis** | **7** | 1 sem unidade (CODÓ), 1 com aviso (celular "123") |

Marcando "o tipo de OS precisa corresponder ao km": só `…00103` sai (1ª revisão × 1000 km);
`…00104` (OS de 1ª revisão, lista de 6000 km) e `…00105` (EXTERNO - PACOTE) ficam. **Elegíveis: 9.**

| Espelhamento | Linhas |
|---|---|
| Lidas | 6 |
| Inválidas | 1 (chassi `ABC123`) |
| OS novas | 5 |
| Conclusões automáticas | 1: `9C2TST0000T000004` tem revisão de 1000 km aberta no seed e OS de 1ª revisão |

O `…000008` tem OS de 2ª revisão, mas a revisão aberta dele é a de 1000 km: não conclui.
