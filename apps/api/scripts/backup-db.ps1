<#
.SYNOPSIS
  Faz uma copia de seguranca (backup) do banco do sistema.

.DESCRIPTION
  Usa o pg_dump do PostgreSQL no formato "custom" (-Fc): um arquivo unico,
  compactado, que o pg_restore consegue restaurar inteiro ou em partes.

  O script:
    1. Le a DATABASE_URL do apps/api/.env (a senha NUNCA aparece na tela nem
       na linha de comando: vai pela variavel PGPASSWORD so durante o backup);
    2. Grava o arquivo gestao_pos_venda_AAAA-MM-DD_HHmm.dump na pasta de destino;
    3. Apaga os backups mais antigos que -ManterDias (padrao: 30 dias).

  ATENCAO: o backup tem dados pessoais dos clientes (nome, CPF, celular).
    - A pasta "backups/" esta no .gitignore: nunca vai para o GitHub.
    - Em producao, guarde os backups num lugar com acesso restrito e,
      de preferencia, com uma copia fora do servidor (combinar com a TI).

  Para rodar todo dia, agende no "Agendador de Tarefas" do Windows (ver
  docs/implantacao.md, secao Backup).

.EXAMPLE
  # Dentro de apps/api (ou: npm run db:backup)
  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1

.EXAMPLE
  # Outra pasta e mais dias guardados
  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1 -Destino D:\backups -ManterDias 90
#>

param(
  # Pasta dos executaveis do PostgreSQL (pg_dump.exe)
  [string]$PgBin = "C:\Program Files\PostgreSQL\18\bin",
  # Onde gravar os backups (padrao: pasta "backups" na raiz do repositorio)
  [string]$Destino = (Join-Path $PSScriptRoot "..\..\..\backups"),
  # Backups mais antigos que isso sao apagados (0 = nunca apagar)
  [int]$ManterDias = 30
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib-banco.ps1")

$pgDump = Join-Path $PgBin "pg_dump.exe"
if (-not (Test-Path $pgDump)) {
  Write-Host "pg_dump.exe nao encontrado em $PgBin. Informe o caminho com -PgBin." -ForegroundColor Red
  exit 1
}

$con = Ler-Conexao
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$Destino = (Resolve-Path $Destino).Path
$arquivo = Join-Path $Destino ("{0}_{1}.dump" -f $con.Banco, (Get-Date -Format "yyyy-MM-dd_HHmm"))

Write-Host "Fazendo backup do banco '$($con.Banco)'..." -ForegroundColor Cyan
$env:PGPASSWORD = $con.Senha
try {
  & $pgDump -h $con.Servidor -p $con.Porta -U $con.Usuario -d $con.Banco -Fc --no-owner -f $arquivo
  if ($LASTEXITCODE -ne 0) { throw "pg_dump terminou com erro (codigo $LASTEXITCODE)." }
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

$tamanho = [math]::Round((Get-Item $arquivo).Length / 1KB, 1)
Write-Host "Backup gravado: $arquivo ($tamanho KB)" -ForegroundColor Green

# --- Limpa backups antigos ----------------------------------------------------
if ($ManterDias -gt 0) {
  $limite = (Get-Date).AddDays(-$ManterDias)
  $antigos = Get-ChildItem -Path $Destino -Filter "$($con.Banco)_*.dump" | Where-Object { $_.LastWriteTime -lt $limite }
  foreach ($a in $antigos) {
    Remove-Item $a.FullName
    Write-Host "Apagado (mais de $ManterDias dias): $($a.Name)"
  }
}
