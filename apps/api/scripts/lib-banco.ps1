<#
.SYNOPSIS
  Funcoes comuns dos scripts de banco (backup e teste de restauracao).

.DESCRIPTION
  Nao rode este arquivo sozinho: os outros scripts o carregam com
    . (Join-Path $PSScriptRoot "lib-banco.ps1")

  Ler-Conexao le a DATABASE_URL do apps/api/.env e devolve as partes
  (servidor, porta, usuario, senha, banco). A senha fica so na memoria.
#>

function Ler-Conexao {
  $envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
  if (-not (Test-Path $envPath)) {
    throw "Arquivo $envPath nao encontrado. Rode antes o scripts\setup-db-local.ps1."
  }
  $linha = Get-Content $envPath | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
  if (-not $linha) { throw "DATABASE_URL nao encontrada em $envPath." }

  # Tira o nome da variavel e as aspas: postgresql://usuario:senha@servidor:porta/banco?schema=public
  $url = ($linha -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")
  if ($url -notmatch '^postgres(?:ql)?://([^:]+):([^@]*)@([^:/]+)(?::(\d+))?/([^?]+)') {
    throw "DATABASE_URL em formato inesperado (esperado postgresql://usuario:senha@servidor:porta/banco)."
  }
  $porta = 5432
  if ($Matches[4]) { $porta = [int]$Matches[4] }
  return [pscustomobject]@{
    Usuario  = [uri]::UnescapeDataString($Matches[1])
    Senha    = [uri]::UnescapeDataString($Matches[2])
    Servidor = $Matches[3]
    Porta    = $porta
    Banco    = $Matches[5]
  }
}
