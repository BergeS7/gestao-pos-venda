# Implantação (colocar o sistema no ar)

Guia da Etapa 11 para quem vai publicar o sistema, normalmente a TI da empresa. Diz como o sistema roda em produção, o que precisa ser configurado, como criar o primeiro acesso e como cuidar dos backups.

> A escolha do servidor ou serviço de hospedagem depende da TI. As opções da seção 2 são sugestões; os passos das seções 3 a 6 valem para qualquer uma.

---

## 1. Como o sistema roda em produção

Em produção existe **um único serviço Node.js** que entrega as telas e a API no **mesmo endereço**:

```
https://posvenda.exemplo.com.br/            → telas (build do React em apps/web/dist)
https://posvenda.exemplo.com.br/api/...     → API (Express)
```

Por que no mesmo endereço:
- O login usa um cookie `httpOnly` com `SameSite=Strict`, que o navegador **só envia para o mesmo site**. Telas num domínio e API em outro (por exemplo Vercel + Render) quebrariam o login.
- Não precisa de CORS nem de configuração extra no navegador.

Quem decide isso é o `config.ts`: com `NODE_ENV=production` e o build do frontend presente, a API passa a servir as telas (`servirFrontend`). Os arquivos de `/assets` têm o "hash" da versão no nome e ficam em cache por 1 ano; o `index.html` nunca fica em cache, para a versão nova aparecer assim que for publicada.

**Segurança já incluída:**
- Cabeçalhos de segurança (`helmet`): política de conteúdo (CSP) que só permite scripts do próprio sistema e as fontes do Google, bloqueio de abertura dentro de outros sites (`frame-ancestors 'none'`), HSTS e `nosniff`.
- Cookie de sessão `Secure` em produção (só trafega em HTTPS).
- Senhas com bcrypt, bloqueio após 5 senhas erradas, auditoria das alterações (Etapa 9).

**Obrigatório:** publicar com **HTTPS**. O serviço de hospedagem ou um proxy (IIS, Nginx, Caddy) cuida do certificado.

---

## 2. Opções de hospedagem (validar com a TI)

| Opção | Como fica | Prós | Contras |
|---|---|---|---|
| **A. Servidor da empresa** (Windows ou Linux) | Node.js 20+ e PostgreSQL instalados no servidor; o serviço Node atrás de um proxy com HTTPS | Dados de clientes ficam dentro da empresa; sem mensalidade de hospedagem | A TI cuida de atualizações, energia, backup externo |
| **B. Serviço gerenciado** (ex.: Render, Railway) | Um "web service" Node + um PostgreSQL gerenciado do mesmo provedor | HTTPS e reinício automáticos; backup do banco oferecido pelo provedor | Mensalidade; dados pessoais num provedor externo (avaliar a LGPD e o contrato) |

Nos dois casos é **um serviço só** (seção 1). Não é recomendado separar telas e API em provedores diferentes.

---

## 3. Variáveis de ambiente (produção)

Configuradas no painel do provedor ou no `apps/api/.env` do servidor (que nunca vai para o Git). O modelo completo está em [`apps/api/.env.example`](../apps/api/.env.example).

| Variável | Valor em produção |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | a porta que o provedor ou o proxy indicar (ex.: `3333`) |
| `DATABASE_URL` | conexão com o PostgreSQL de produção, com um usuário próprio do sistema (não o `postgres`) |
| `JWT_SECRET` | chave **nova**, aleatória, 32+ caracteres. Gerar com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Nunca reaproveitar a de desenvolvimento |
| `SESSAO_HORAS` | validade do login (padrão 10) |
| `CORS_ORIGIN` | o endereço público do sistema (ex.: `https://posvenda.exemplo.com.br`) |
| `SEED_SENHA` | **não usar** em produção |

Variáveis usadas **só uma vez**, para criar o primeiro Admin (seção 4): `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_SENHA_PROVISORIA`.

---

## 4. Primeira publicação, passo a passo

Na raiz do repositório, no servidor ou no "build command" do provedor:

```bash
# 1. Instalar as dependências (o "postinstall" da raiz instala também as da API e do frontend)
npm ci

# 2. Compilar a API e gerar o build das telas
npm run build

# 3. Criar ou atualizar as tabelas (aplica as migrações versionadas)
npm --prefix apps/api run db:deploy

# 4. Unidades, motivos e o PRIMEIRO Admin (só na primeira vez)
#    Informe os dados só neste comando; a senha é provisória.
ADMIN_NOME="Nome do Administrador" ADMIN_EMAIL="admin@empresa.com.br" ADMIN_SENHA_PROVISORIA="..." npm --prefix apps/api run db:producao

# 5. Subir o sistema
npm --prefix apps/api start
```

No Windows (PowerShell), o passo 4 fica assim:
```powershell
$env:ADMIN_NOME="Nome do Administrador"; $env:ADMIN_EMAIL="admin@empresa.com.br"; $env:ADMIN_SENHA_PROVISORIA="..."
npm.cmd --prefix apps/api run db:producao
Remove-Item Env:ADMIN_NOME, Env:ADMIN_EMAIL, Env:ADMIN_SENHA_PROVISORIA
```

O que o `db:producao` faz (`apps/api/prisma/producao.ts`):
- grava as 3 unidades e os 11 motivos;
- cria o primeiro Admin **só se ainda não houver Admin ativo**, com `trocar_senha = true`: no primeiro login o sistema obriga a criar uma senha própria;
- **não** cria os clientes e usuários fictícios do desenvolvimento. O seed (`db:seed`) se recusa a rodar com `NODE_ENV=production`.

Depois do primeiro login, o Admin cadastra a equipe na tela **Usuários**.

**Conferir:** abrir `https://.../api/health` (deve responder `{"ok":true,...}`) e depois a tela de login. O provedor pode usar `/api/health` como "health check".

---

## 5. Atualizar para uma versão nova

```bash
git pull
npm ci
npm run build
npm --prefix apps/api run db:backup     # backup ANTES de mexer no banco (seção 6)
npm --prefix apps/api run db:deploy     # aplica só as migrações novas
# reiniciar o serviço Node
```

Antes de publicar, rode `npm run check` na sua máquina: formato, lint, tipos, testes e build dos dois apps.

---

## 6. Backup do banco

Scripts em `apps/api/scripts/` (PowerShell, usam o `pg_dump` e o `pg_restore` do PostgreSQL):

| Comando | O que faz |
|---|---|
| `npm run db:backup` | Grava `backups/gestao_pos_venda_AAAA-MM-DD_HHmm.dump` (formato compactado do `pg_dump`) e apaga os backups com mais de 30 dias |
| `npm run db:testar-backup` | Restaura o backup mais recente num banco **temporário**, compara a quantidade de linhas de cada tabela com o banco original e apaga o temporário. Termina com `RESTAURACAO OK` |

Opções: `-Destino D:\backups -ManterDias 90` no backup; `-Arquivo caminho.dump` no teste; `-PgBin` se o PostgreSQL não estiver em `C:\Program Files\PostgreSQL\18\bin`.

**Rotina recomendada:**
1. **Backup diário** agendado no Agendador de Tarefas do Windows (ou `cron` no Linux). Ação: `powershell -ExecutionPolicy Bypass -File C:\caminho\apps\api\scripts\backup-db.ps1 -Destino D:\backups`.
2. **Teste de restauração mensal** com `db:testar-backup`, anotando a data e o resultado.
3. **Cópia fora do servidor** (outro disco, outro prédio ou nuvem da empresa), para não perder tudo junto com o servidor.

**Cuidados (LGPD, ver também [lgpd.md](lgpd.md)):**
- O backup tem dados pessoais dos clientes (nome, CPF, celular). Guarde-o em pasta com acesso restrito.
- A pasta `backups/` está no `.gitignore` e nunca vai para o GitHub.
- No computador de desenvolvimento, a pasta do projeto fica no OneDrive: use só dados fictícios ali.

Para **restaurar de verdade** (desastre), com o sistema parado:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h SERVIDOR -U pos_venda -d gestao_pos_venda --clean --if-exists --no-owner ARQUIVO.dump
```

---

## 7. Checklist para a TI

- [ ] Hospedagem escolhida (seção 2) e endereço com HTTPS
- [ ] PostgreSQL de produção criado, com usuário próprio do sistema
- [ ] Variáveis da seção 3 configuradas, com `JWT_SECRET` novo
- [ ] Passos da seção 4 executados; login do primeiro Admin feito e senha trocada
- [ ] Backup diário agendado, com cópia fora do servidor
- [ ] Primeiro teste de restauração feito (`RESTAURACAO OK`)
- [ ] Equipe cadastrada na tela Usuários
- [ ] Prazo de guarda decidido e `npm run db:retencao` agendado ([lgpd.md](lgpd.md), seção 5)
- [ ] Piloto com a oficina combinado (ROTEIRO, Etapa 11)
