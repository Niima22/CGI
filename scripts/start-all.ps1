param(
    [ValidateRange(1, 65535)]
    [int]$FrontendPort = 5173,

    [switch]$SkipBuild,
    [switch]$SkipHealth,
    [switch]$SeedUsers
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "FRONTCODED"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    & $Command
}

function Assert-Command {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$InstallHint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was not found. $InstallHint"
    }
}

Assert-Command "docker" "Install Docker Desktop and start the Docker engine."
Assert-Command "java" "Install a JDK and make java available on PATH."
Assert-Command "npm.cmd" "Install Node.js, then reopen PowerShell."

if (-not (Test-Path (Join-Path $repoRoot ".env"))) {
    Write-Host "No repo-root .env found. Defaults from scripts/start-dev.ps1 will be used where possible."
}

if (-not (Test-Path (Join-Path $frontendRoot "node_modules"))) {
    Invoke-Step "Installing FRONTCODED dependencies" {
        npm.cmd install --prefix $frontendRoot
    }
}

if (-not $SkipBuild) {
    Invoke-Step "Building backend services" {
        & (Join-Path $PSScriptRoot "build-backend.ps1")
    }
}

Invoke-Step "Starting Docker, backend services, AI service, KPI app, and FRONTCODED" {
    & (Join-Path $PSScriptRoot "start-dev.ps1") -FrontendPort $FrontendPort
}

if ($SeedUsers) {
    Invoke-Step "Seeding local Keycloak users" {
        & (Join-Path $PSScriptRoot "seed-keycloak-dev-users.ps1")
    }
}

if (-not $SkipHealth) {
    Invoke-Step "Checking service health" {
        & (Join-Path $PSScriptRoot "health-dev.ps1") -FrontendPort $FrontendPort
    }
}

Write-Host ""
Write-Host "All launch steps finished."
Write-Host "Frontend: http://127.0.0.1:$FrontendPort/"
Write-Host "Logs:     $(Join-Path $repoRoot ".run")"
