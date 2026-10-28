<#
.SYNOPSIS
    Script de gerenciamento do banco de dados PostgreSQL para o AppFit.
.DESCRIPTION
    Permite iniciar, parar, verificar status e recriar o esquema do banco de dados appfit_db.
.PARAMETER Action
    start, stop, status, reset, psql
#>
param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "status", "reset", "psql")]
    [string]$Action = "status"
)

$pgsqlBin = "C:\Users\Luan Azevedo\pgsql\bin"
$pgsqlData = "C:\Users\Luan Azevedo\pgsql\data"
$logfile = "C:\Users\Luan Azevedo\pgsql\logfile.log"
$schemaPath = Join-Path $PSScriptRoot "schema.sql"
$seedPath = Join-Path $PSScriptRoot "seed.sql"

switch ($Action) {
    "start" {
        Write-Host "Iniciando PostgreSQL..." -ForegroundColor Cyan
        & "$pgsqlBin\pg_ctl.exe" -D $pgsqlData -l $logfile start
    }
    "stop" {
        Write-Host "Parando PostgreSQL..." -ForegroundColor Yellow
        & "$pgsqlBin\pg_ctl.exe" -D $pgsqlData stop -m fast
    }
    "status" {
        Write-Host "Verificando status do PostgreSQL..." -ForegroundColor Cyan
        & "$pgsqlBin\pg_ctl.exe" -D $pgsqlData status
    }
    "psql" {
        & "$pgsqlBin\psql.exe" -U postgres -d appfit_db
    }
    "reset" {
        Write-Host "Recriando banco de dados appfit_db..." -ForegroundColor Yellow
        & "$pgsqlBin\psql.exe" -U postgres -d appfit_db -f $schemaPath
        & "$pgsqlBin\psql.exe" -U postgres -d appfit_db -f $seedPath
        Write-Host "Banco de dados recriado e populado com sucesso!" -ForegroundColor Green
    }
}
