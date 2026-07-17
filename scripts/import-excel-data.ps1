$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Split-Path -Parent $PSScriptRoot

function Import-DotEnv {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    foreach ($line in Get-Content -Path $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $parts = $trimmed -split "=", 2
        if ($parts.Count -ne 2) {
            continue
        }

        [System.Environment]::SetEnvironmentVariable(
            $parts[0].Trim(),
            $parts[1].Trim().Trim('"').Trim("'"),
            "Process"
        )
    }
}

function Ensure-PythonModule {
    param([Parameter(Mandatory = $true)][string]$ModuleName, [Parameter(Mandatory = $true)][string]$PackageName)

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & python -c "import $ModuleName" *> $null
    $moduleExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference

    if ($moduleExitCode -ne 0) {
        Write-Host "Installing Python package $PackageName..."
        & python -m pip install --user $PackageName
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install Python package $PackageName."
        }
    }
}

Import-DotEnv (Join-Path $repoRoot ".env")

if (-not $env:POSTGRES_HOST) { $env:POSTGRES_HOST = if ($env:TICKET_DB_HOST) { $env:TICKET_DB_HOST } else { "127.0.0.1" } }
if (-not $env:POSTGRES_PORT) { $env:POSTGRES_PORT = if ($env:TICKET_DB_PORT) { $env:TICKET_DB_PORT } else { "55432" } }
if (-not $env:POSTGRES_USER) { $env:POSTGRES_USER = if ($env:SPRING_DATASOURCE_USERNAME) { $env:SPRING_DATASOURCE_USERNAME } else { "postgres" } }
if (-not $env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD = if ($env:SPRING_DATASOURCE_PASSWORD) { $env:SPRING_DATASOURCE_PASSWORD } else { "postgres" } }
if (-not $env:AUTH_DB_NAME) { $env:AUTH_DB_NAME = "cgi_flow_auth" }
if (-not $env:TICKET_DB_NAME) { $env:TICKET_DB_NAME = "cgi_flow_ticket" }
if (-not $env:EMPLOYEE_DB_NAME) { $env:EMPLOYEE_DB_NAME = "cgi_flow_employee" }
if (-not $env:PLANNING_DB_NAME) { $env:PLANNING_DB_NAME = "cgi_flow_planning" }

Ensure-PythonModule "openpyxl" "openpyxl"
Ensure-PythonModule "psycopg2" "psycopg2-binary"

$scriptPath = Join-Path $PSScriptRoot "import_excel_data.py"
$dataDir = Join-Path $repoRoot "dataexcel"

& python $scriptPath `
    --data-dir $dataDir `
    --host $env:POSTGRES_HOST `
    --port $env:POSTGRES_PORT `
    --user $env:POSTGRES_USER `
    --password $env:POSTGRES_PASSWORD `
    --auth-db $env:AUTH_DB_NAME `
    --ticket-db $env:TICKET_DB_NAME `
    --employee-db $env:EMPLOYEE_DB_NAME `
    --planning-db $env:PLANNING_DB_NAME

if ($LASTEXITCODE -ne 0) {
    throw "Excel import failed."
}
