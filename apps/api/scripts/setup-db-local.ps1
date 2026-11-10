<#
.SYNOPSIS
  Cria o banco de dados local do sistema (PostgreSQL) e configura o .env da API.

.DESCRIPTION
  Roda UMA VEZ, depois de instalar o PostgreSQL no Windows. O script:
    1. Gera uma senha aleatoria para o usuario do sistema (pos_venda);
    2. Conecta como administrador (postgres) - o psql vai PEDIR a senha do postgres;
    3. Cria (ou atualiza) o usuario "pos_venda" com permissao CREATEDB
       (o Prisma precisa dela para o "shadow database" das migracoes);
    4. Cria o banco "gestao_pos_venda", com o pos_venda como dono;
    5. Grava DATABASE_URL no arquivo apps/api/.env.

  Boas praticas aplicadas:
    - O sistema NAO usa o administrador "postgres"; usa um usuario proprio.
    - A senha gerada nunca aparece na tela nem vai para o Git (.env e ignorado).
    - Pode rodar de novo sem quebrar nada: se o usuario/banco ja existirem,
      so a senha e trocada e o .env atualizado.

.EXAMPLE
  # Dentro de apps/api:
  powershell -ExecutionPolicy Bypass -File scripts\setup-db-local.ps1
#>

param(
  # Pasta dos executaveis do PostgreSQL (psql.exe)
  [string]$PgBin = "C:\Program Files\PostgreSQL\18\bin",
  # Servidor e porta do PostgreSQL
  [string]$PgHost = "localhost",
  [int]$PgPort = 5432,
  # Nome do banco e do usuario do sistema
  [string]$Banco = "gestao_pos_venda",
  [string]$Usuario = "pos_venda"
)

$ErrorActionPreference = "Stop"

# --- 1. Localiza o psql -------------------------------------------------------
$psql = Join-Path $PgBin "psql.exe"
if (-not (Test-Path $psql)) {
  Write-Host "psql.exe nao encontrado em $PgBin. Informe o caminho com -PgBin." -ForegroundColor Red
  exit 1
}

# --- 2. Gera a senha do usuario do sistema ------------------------------------
# Apenas letras e numeros: evita ter que "escapar" caracteres especiais na URL.
$chars = [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 24
$rng.GetBytes($bytes)
$senha = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })

# --- 3. SQL de criacao (idempotente) ------------------------------------------
# Variaveis do psql: :'nome' vira texto entre aspas; \gexec executa o comando
# montado pelo SELECT (CREATE DATABASE nao pode rodar dentro de bloco DO).
$sql = @'
\set ON_ERROR_STOP on
SELECT format('CREATE ROLE %I LOGIN CREATEDB PASSWORD %L', :'usuario', :'senha')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'usuario') \gexec
SELECT format('ALTER ROLE %I LOGIN CREATEDB PASSWORD %L', :'usuario', :'senha')
 WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'usuario') \gexec
SELECT format('CREATE DATABASE %I OWNER %I ENCODING ''UTF8''', :'banco', :'usuario')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'banco') \gexec
'@

# O SQL vai num arquivo temporario para o teclado continuar livre
# (o psql precisa dele para pedir a senha do postgres).
$tmp = Join-Path $env:TEMP ("setup-db-" + [guid]::NewGuid().ToString() + ".sql")
[System.IO.File]::WriteAllText($tmp, $sql, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "Conectando ao PostgreSQL como 'postgres'..." -ForegroundColor Cyan
Write-Host "Digite a senha do usuario postgres (a que voce criou na instalacao)." -ForegroundColor Cyan
Write-Host ""

try {
  & $psql -h $PgHost -p $PgPort -U postgres -d postgres -q `
    -v "usuario=$Usuario" -v "senha=$senha" -v "banco=$Banco" -f $tmp
  if ($LASTEXITCODE -ne 0) { throw "psql terminou com erro (codigo $LASTEXITCODE)." }
}
catch {
  Write-Host ""
  Write-Host "Falhou: $_" -ForegroundColor Red
  Write-Host "Confira a senha do postgres e se o servico do PostgreSQL esta rodando." -ForegroundColor Red
  exit 1
}
finally {
  Remove-Item $tmp -ErrorAction SilentlyContinue
}

# --- 4. Grava DATABASE_URL no .env --------------------------------------------
$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
$url = "postgresql://${Usuario}:${senha}@${PgHost}:${PgPort}/${Banco}?schema=public"
$linha = "DATABASE_URL=`"$url`""

$linhas = @()
if (Test-Path $envPath) { $linhas = @(Get-Content $envPath) }
if ($linhas -match '^DATABASE_URL=') {
  $linhas = $linhas | ForEach-Object { if ($_ -match '^DATABASE_URL=') { $linha } else { $_ } }
}
else {
  $linhas += ""
  $linhas += "# Conexao com o banco local (gerado por scripts/setup-db-local.ps1)"
  $linhas += $linha
}
# UTF-8 sem BOM: o formato que o dotenv espera.
[System.IO.File]::WriteAllLines($envPath, [string[]]$linhas, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
Write-Host "  Banco:   $Banco"
Write-Host "  Usuario: $Usuario"
Write-Host "  DATABASE_URL gravada em $envPath (a senha nao e exibida)."
