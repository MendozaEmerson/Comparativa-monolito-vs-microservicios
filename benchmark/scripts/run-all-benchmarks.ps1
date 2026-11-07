# Automated Benchmark Orchestrator for TAIS Hito 2
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  BENCHMARK ORCHESTRATOR: MONOLITO MODULAR VS. MICROSERVICIOS   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$ResultsDir = Join-Path $PSScriptRoot "..\results"
if (-not (Test-Path $ResultsDir)) {
    New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null
}

function Run-Treatment([string]$Name, [string]$ComposeFile) {
    Write-Host "`n>>> [TREATMENT: $Name] Starting Environment ($ComposeFile) <<<" -ForegroundColor Yellow
    docker compose -f $ComposeFile down -v 2>$null
    docker compose -f $ComposeFile up --build -d

    Write-Host "Waiting for database and services to report healthy (15s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 15

    # Check health
    $Health = curl -s http://localhost:3000/health 2>$null
    Write-Host "Health Check: $Health" -ForegroundColor Green

    $MetricsJob = Start-Job -ScriptBlock {
        param($ScriptPath, $EnvName)
        powershell -ExecutionPolicy Bypass -File $ScriptPath -Environment $EnvName -DurationSeconds 150
    } -ArgumentList (Join-Path $PSScriptRoot "collect-metrics.ps1"), $Name

    Write-Host "Executing k6 Load Test (Ramping 10 -> 200 VUs)..." -ForegroundColor Yellow
    k6 run (Join-Path $PSScriptRoot "..\k6\load-test.js")

    Write-Host "Executing k6 Stress Test (Contention 150 VUs on 20 seats)..." -ForegroundColor Yellow
    k6 run (Join-Path $PSScriptRoot "..\k6\stress-test.js")

    Write-Host "Stopping metrics collection and environment..." -ForegroundColor Gray
    Stop-Job $MetricsJob -ErrorAction SilentlyContinue
    Remove-Job $MetricsJob -ErrorAction SilentlyContinue

    docker compose -f $ComposeFile down -v
    Write-Host ">>> [TREATMENT: $Name] Completed successfully! <<<`n" -ForegroundColor Green
}

# 1. Run Monolith Treatment
Run-Treatment -Name "monolith" -ComposeFile "docker-compose.monolith.yml"

Write-Host "Cooling down host machine (15s)..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# 2. Run Microservices Treatment
Run-Treatment -Name "microservices" -ComposeFile "docker-compose.microservices.yml"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " All benchmarks finished! Check the CSV results in benchmark/results" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

