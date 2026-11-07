param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "monolith",
    
    [Parameter(Mandatory=$false)]
    [int]$DurationSeconds = 180,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ""
)

if (-not $OutputFile) {
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputDir = Join-Path $PSScriptRoot "..\results"
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    $OutputFile = Join-Path $OutputDir "metrics_${Environment}_${Timestamp}.csv"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Docker Metrics Collector ($Environment)" -ForegroundColor Cyan
Write-Host " Output file: $OutputFile" -ForegroundColor Yellow
Write-Host " Duration: $DurationSeconds seconds" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# CSV Header
"Timestamp,Container,CPUPerc,MemUsage,MemPerc,NetIO,BlockIO" | Out-File -FilePath $OutputFile -Encoding utf8

$StartTime = Get-Date
$EndTime = $StartTime.AddSeconds($DurationSeconds)

while ((Get-Date) -lt $EndTime) {
    $Now = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $StatsRaw = docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}" 2>$null

    if ($StatsRaw) {
        foreach ($line in $StatsRaw) {
            if ($line -match "benchmark_") {
                "$Now,$line" | Out-File -FilePath $OutputFile -Append -Encoding utf8
            }
        }
    }
    Start-Sleep -Seconds 1
}

Write-Host "Metrics collection finished successfully: $OutputFile" -ForegroundColor Green

