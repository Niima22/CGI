$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$mavenCandidates = @(
    "mvn.cmd",
    "$env:LOCALAPPDATA\Programs\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin\mvn.cmd"
)

$maven = $mavenCandidates | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue } | Select-Object -First 1
if (-not $maven) {
    throw "Maven was not found. Install Maven or adjust scripts/build-backend.ps1 to point to your mvn.cmd."
}

$servicePorts = @{
    "discovery-service" = 8761
    "api-gateway" = 8080
    "auth-user-service" = 8081
    "employee-service" = 8082
    "ticket-service" = 8083
    "sla-service" = 8084
    "planning-service" = 8087
}

function Stop-ManagedListener {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceName,
        [Parameter(Mandatory = $true)][int]$Port
    )

    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $listeners) {
        return
    }

    $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            Write-Host "Stopping $ServiceName on port $Port (PID $processId) before rebuild..."
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            throw "Failed to stop $ServiceName on port $Port. $($_.Exception.Message)"
        }
    }
}

$services = @(
    "auth-user-service",
    "employee-service",
    "discovery-service",
    "api-gateway",
    "ticket-service",
    "sla-service",
    "planning-service"
)

foreach ($service in $services) {
    $serviceDir = Join-Path $repoRoot "backend\$service"
    if (Test-Path (Join-Path $serviceDir "pom.xml")) {
        if ($servicePorts.ContainsKey($service)) {
            Stop-ManagedListener -ServiceName $service -Port $servicePorts[$service]
        }
        Write-Host "Building $service..."
        & $maven -f (Join-Path $serviceDir "pom.xml") clean package
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed for $service."
        }
    }
}
