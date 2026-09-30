<#
.SYNOPSIS
    Generates HTTP traffic against the API so Prometheus and Grafana have data.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\load-test.ps1 -Requests 500

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\load-test.ps1 -BaseUrl http://localhost:3000 -DelayMs 20
#>
[CmdletBinding()]
param(
    [string] $BaseUrl = 'http://localhost:3000',
    [int]    $Requests = 300,
    [int]    $DelayMs = 100,
    [switch] $IncludeErrors
)

$ErrorActionPreference = 'Stop'

Write-Host "Load testing $BaseUrl with $Requests requests (delay ${DelayMs}ms)" -ForegroundColor Cyan

# Make sure the API is up before hammering it.
try {
    $null = Invoke-RestMethod "$BaseUrl/health" -TimeoutSec 5
    Write-Host 'API is healthy, starting...' -ForegroundColor Green
} catch {
    Write-Host "API is not reachable at $BaseUrl - start it with 'docker compose up -d'" -ForegroundColor Red
    exit 1
}

$paths = @('/', '/health', '/health/ready', '/health/detail', '/api/items', '/api/items/1', '/metrics')

$success = 0
$failed = 0
$start = Get-Date

for ($i = 1; $i -le $Requests; $i++) {
    $path = $paths[$i % $paths.Count]

    try {
        $null = Invoke-WebRequest "$BaseUrl$path" -UseBasicParsing -TimeoutSec 10
        $success++
    } catch {
        $failed++
        Write-Verbose "Request $i to $path failed: $_"
    }

    # Deliberately generate some 404s and 400s so the error panels have data.
    if ($IncludeErrors -and ($i % 10 -eq 0)) {
        try {
            $null = Invoke-WebRequest "$BaseUrl/api/items/does-not-exist" -UseBasicParsing -TimeoutSec 10
        } catch { }
    }

    if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
}

$elapsed = ((Get-Date) - $start).TotalSeconds

Write-Host ''
Write-Host '--- Results ---' -ForegroundColor Cyan
Write-Host ("Successful : {0}" -f $success)
Write-Host ("Failed     : {0}" -f $failed)
Write-Host ("Duration   : {0:N1}s" -f $elapsed)
Write-Host ("Throughput : {0:N1} req/sec" -f ($Requests / $elapsed))
Write-Host ''
Write-Host 'Open http://localhost:9090 (Prometheus) and http://localhost:3001 (Grafana)' -ForegroundColor Cyan
Write-Host 'PromQL: sum(rate(api_http_requests_total[1m]))' -ForegroundColor DarkGray
