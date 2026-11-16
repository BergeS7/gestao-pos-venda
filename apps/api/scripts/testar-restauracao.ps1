<#
.SYNOPSIS
  Confere se um backup realmente volta: restaura num banco temporario e compara.

.DESCRIPTION
  Backup que nunca foi testado nao e backup. Este script:
    1. Pega o backup mais recente da pasta (ou o arquivo informado em -Arquivo);
    2. Cria um banco TEMPORARIO (gestao_pos_venda_teste_restauracao);
    3. Restaura o backup nele com o pg_restore;
    4. Compara a quantidade de linhas de CADA tabela com o banco original;
    5. Apaga o banco temporario (o banco do sistema nao e alterado).

  Termina com "RESTAURACAO OK" ou com a lista das tabelas que nao bateram.
  Se o sistema estiver em uso durante o teste, uma tabela pode ter mudado
  entre o backup e a comparacao: nesse caso, faca um backup novo e repita.

.EXAMPLE
  # Dentro de apps/api (ou: npm run db:testar-backup)
  powershell -ExecutionPolicy Bypass -File scripts\testar-restauracao.ps1
#>

param(
  [string]$PgBin = "C:\Program Files\PostgreSQL\18\bin",
  # Pasta onde estao os backups (a mesma do backup-db.ps1)
  [string]$Pasta = (Join-Path $PSScriptRoot "..\..\..\backups"),
  # Backup especifico; vazio = o mais recente da pasta
  [string]$Arquivo = ""
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib-banco.ps1")

$psql = Join-Path $PgBin "psql.exe"
$pgRestore = Join-Path $PgBin "pg_restore.exe"
foreach ($exe in @($psql, $pgRestore)) {
  if (-not (Test-Path $exe)) { Write-Host "$exe nao encontrado. Informe -PgBin." -ForegroundColor Red; exit 1 }
}

$con = Ler-Conexao
if (-not $Arquivo) {
  $ultimo = Get-ChildItem -Path $Pasta -Filter "$($con.Banco)_*.dump" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $ultimo) { Write-Host "Nenhum backup em $Pasta. Rode antes o backup-db.ps1." -ForegroundColor Red; exit 1 }
  $Arquivo = $ultimo.FullName
}
$temp = "$($con.Banco)_teste_restauracao"
Write-Host "Backup: $Arquivo" -ForegroundColor Cyan

# Roda um SQL e devolve a saida sem cabecalho (-tA), uma linha por resultado
function Sql([string]$banco, [string]$comando) {
  $saida = & $psql -h $con.Servidor -p $con.Porta -U $con.Usuario -d $banco -tA -v ON_ERROR_STOP=1 -c $comando
  if ($LASTEXITCODE -ne 0) { throw "psql falhou: $comando" }
  return $saida
}

# Quantidade de linhas de cada tabela do schema public: "tabela|quantidade"
$contar = @'
SELECT string_agg(format('SELECT %L || ''|'' || count(*) FROM %I', tablename, tablename), ' UNION ALL ' ORDER BY tablename)
  FROM pg_tables WHERE schemaname = 'public'
'@

$env:PGPASSWORD = $con.Senha
$falhou = $false
try {
  Sql $con.Banco "DROP DATABASE IF EXISTS `"$temp`"" | Out-Null
  Sql $con.Banco "CREATE DATABASE `"$temp`"" | Out-Null

  Write-Host "Restaurando no banco temporario '$temp'..." -ForegroundColor Cyan
  & $pgRestore -h $con.Servidor -p $con.Porta -U $con.Usuario -d $temp --no-owner --exit-on-error $Arquivo
  if ($LASTEXITCODE -ne 0) { throw "pg_restore terminou com erro (codigo $LASTEXITCODE)." }

  $consulta = (Sql $con.Banco $contar) -join ""
  $original = @{}; foreach ($l in (Sql $con.Banco $consulta)) { $p = $l -split '\|'; $original[$p[0]] = [int]$p[1] }
  $restaurado = @{}; foreach ($l in (Sql $temp $consulta)) { $p = $l -split '\|'; $restaurado[$p[0]] = [int]$p[1] }

  Write-Host ""
  Write-Host ("{0,-24} {1,10} {2,12}" -f "Tabela", "Original", "Restaurado")
  foreach ($t in ($original.Keys | Sort-Object)) {
    $ok = $restaurado.ContainsKey($t) -and $restaurado[$t] -eq $original[$t]
    if (-not $ok) { $falhou = $true }
    $marca = if ($ok) { "ok" } else { "DIFERENTE" }
    Write-Host ("{0,-24} {1,10} {2,12}  {3}" -f $t, $original[$t], $restaurado[$t], $marca)
  }
}
finally {
  try { Sql $con.Banco "DROP DATABASE IF EXISTS `"$temp`"" | Out-Null } catch { Write-Host "Nao consegui apagar o banco $temp." -ForegroundColor Yellow }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
if ($falhou) {
  Write-Host "RESTAURACAO COM DIFERENCAS (veja as tabelas marcadas acima)." -ForegroundColor Red
  exit 1
}
Write-Host "RESTAURACAO OK: todas as tabelas voltaram com a mesma quantidade de linhas." -ForegroundColor Green
