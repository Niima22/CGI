param(
    [ValidateRange(1, 65535)]
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $repoRoot ".run"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

$managedServices = @(
    @{ Name = "discovery-service"; Port = 8761 },
    @{ Name = "auth-user-service"; Port = 8081 },
    @{ Name = "employee-service"; Port = 8082 },
    @{ Name = "ticket-service"; Port = 8083 },
    @{ Name = "sla-service"; Port = 8084 },
    @{ Name = "messaging-service"; Port = 8086 },
    @{ Name = "planning-service"; Port = 8087 },
    @{ Name = "api-gateway"; Port = 8080 },
    @{ Name = "ai-service"; Port = 8001 },
    @{ Name = "frontend"; Port = $FrontendPort }
)

function Import-DotEnv {
    param(
        [Parameter(Mandatory = $true)][string]$Path
    )

    if (-not (Test-Path $Path)) {
        return
    }

    Write-Host "Loading environment from $Path"
    foreach ($line in Get-Content -Path $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $parts = $trimmed -split "=", 2
        if ($parts.Count -ne 2) {
            continue
        }

        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Start-LoggedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [int]$Port = 0
    )

    $outLog = Join-Path $logRoot "$Name.out.log"
    $errLog = Join-Path $logRoot "$Name.err.log"
    Write-Host "Starting $Name..."
    Start-Process -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $outLog `
        -RedirectStandardError $errLog `
        -WindowStyle Hidden | Out-Null
}

function Assert-DockerReady {
    try {
        docker info | Out-Null
    } catch {
        Write-Host "Docker Desktop engine is not running."
        throw "Docker is not available. Start Docker Desktop before running scripts\start-dev.ps1."
    }
}

function Stop-ManagedListener {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][int]$Port
    )

    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $listeners) {
        return
    }

    $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Write-Host "Stopping stale $Name process on port $Port (PID $processId)..."
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-Host "Failed to stop process on port $Port (PID $processId): $($_.Exception.Message)"
        }
    }
}

function Ensure-PostgresDatabase {
    param(
        [Parameter(Mandatory = $true)][string]$ContainerName,
        [Parameter(Mandatory = $true)][string]$DatabaseName,
        [Parameter(Mandatory = $true)][string]$Username
    )

    $result = docker exec $ContainerName psql -U $Username -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
    if (($result | Out-String).Trim() -ne "1") {
        docker exec $ContainerName psql -U $Username -c "CREATE DATABASE $DatabaseName;" | Out-Null
    }
}

function Wait-Port {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][string]$Name,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($listener) {
            Write-Host "$Name is listening on $Port."
            return
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    throw "$Name did not start on port $Port within $TimeoutSeconds seconds."
}

Import-DotEnv (Join-Path $repoRoot ".env")

if (-not $env:POSTGRES_PASSWORD) {
    $env:POSTGRES_PASSWORD = "postgres"
}
if (-not $env:SPRING_DATASOURCE_PASSWORD) {
    $env:SPRING_DATASOURCE_PASSWORD = $env:POSTGRES_PASSWORD
}
if (-not $env:SPRING_DATASOURCE_USERNAME) {
    $env:SPRING_DATASOURCE_USERNAME = "postgres"
}
if (-not $env:KEYCLOAK_ADMIN_PASSWORD) {
    $env:KEYCLOAK_ADMIN_PASSWORD = "admin"
}
if (-not $env:KEYCLOAK_ADMIN_USERNAME) {
    $env:KEYCLOAK_ADMIN_USERNAME = "admin"
}
if (-not $env:KEYCLOAK_ISSUER_URI) {
    $env:KEYCLOAK_ISSUER_URI = "http://localhost:8085/realms/cgi-flow"
}
if (-not $env:KEYCLOAK_AUTH_SERVER_URL) {
    $env:KEYCLOAK_AUTH_SERVER_URL = "http://localhost:8085"
}
if (-not $env:EUREKA_DEFAULT_ZONE) {
    $env:EUREKA_DEFAULT_ZONE = "http://localhost:8761/eureka"
}
if (-not $env:TICKET_DB_HOST) {
    $env:TICKET_DB_HOST = "127.0.0.1"
}
if (-not $env:TICKET_DB_PORT) {
    $env:TICKET_DB_PORT = "55432"
}
if (-not $env:TICKET_DB_NAME) {
    $env:TICKET_DB_NAME = "cgi_flow_auth"
}
if (-not $env:AUTH_DB_HOST) {
    $env:AUTH_DB_HOST = "127.0.0.1"
}
if (-not $env:AUTH_DB_PORT) {
    $env:AUTH_DB_PORT = "55432"
}
if (-not $env:AUTH_DB_NAME) {
    $env:AUTH_DB_NAME = "cgi_flow_auth"
}
if (-not $env:MESSAGING_DB_HOST) {
    $env:MESSAGING_DB_HOST = "127.0.0.1"
}
if (-not $env:MESSAGING_DB_PORT) {
    $env:MESSAGING_DB_PORT = "55432"
}
if (-not $env:MESSAGING_DB_NAME) {
    $env:MESSAGING_DB_NAME = "cgi_flow_messaging"
}
if (-not $env:PLANNING_DB_HOST) {
    $env:PLANNING_DB_HOST = "127.0.0.1"
}
if (-not $env:PLANNING_DB_PORT) {
    $env:PLANNING_DB_PORT = "55432"
}
if (-not $env:PLANNING_DB_NAME) {
    $env:PLANNING_DB_NAME = "cgi_flow_planning"
}
if (-not $env:SECURITY_DEV_ADMIN_BYPASS) {
    $env:SECURITY_DEV_ADMIN_BYPASS = "false"
}

$ticketDbJdbcUrl = "jdbc:postgresql://$($env:TICKET_DB_HOST):$($env:TICKET_DB_PORT)/$($env:TICKET_DB_NAME)"
$authDbJdbcUrl = "jdbc:postgresql://$($env:AUTH_DB_HOST):$($env:AUTH_DB_PORT)/$($env:AUTH_DB_NAME)"
$messagingDbJdbcUrl = "jdbc:postgresql://$($env:MESSAGING_DB_HOST):$($env:MESSAGING_DB_PORT)/$($env:MESSAGING_DB_NAME)"
$planningDbJdbcUrl = "jdbc:postgresql://$($env:PLANNING_DB_HOST):$($env:PLANNING_DB_PORT)/$($env:PLANNING_DB_NAME)"

Assert-DockerReady
docker compose -f (Join-Path $repoRoot "docker-compose.yml") up -d
Ensure-PostgresDatabase "cgi-flow-auth-postgres" $env:TICKET_DB_NAME $env:SPRING_DATASOURCE_USERNAME
Ensure-PostgresDatabase "cgi-flow-auth-postgres" "cgi_flow_employee" $env:SPRING_DATASOURCE_USERNAME
Ensure-PostgresDatabase "cgi-flow-auth-postgres" $env:MESSAGING_DB_NAME $env:SPRING_DATASOURCE_USERNAME
Ensure-PostgresDatabase "cgi-flow-auth-postgres" $env:PLANNING_DB_NAME $env:SPRING_DATASOURCE_USERNAME
Wait-Port 8091 "kpi-platform-auth-service" 180
Wait-Port 8092 "kpi-platform-agent-service" 180
Wait-Port 8094 "kpi-platform-kpi-service" 180
Wait-Port 8095 "kpi-platform-nps-service" 180
Wait-Port 5180 "kpi-platform-frontend" 180

foreach ($service in $managedServices) {
    Stop-ManagedListener -Name $service.Name -Port $service.Port
}

Start-LoggedProcess "discovery-service" "java" @("-jar", "target\discovery-service-0.0.1-SNAPSHOT.jar") (Join-Path $repoRoot "backend\discovery-service") 8761
Wait-Port 8761 "discovery-service"

Start-LoggedProcess "auth-user-service" "java" @("-jar", "target\auth-user-service-0.0.1-SNAPSHOT.jar", "--spring.datasource.url=$authDbJdbcUrl") (Join-Path $repoRoot "backend\auth-user-service") 8081
Start-LoggedProcess "employee-service" "java" @("-jar", "target\employee-service-0.0.1-SNAPSHOT.jar", "--spring.datasource.url=jdbc:postgresql://localhost:55432/cgi_flow_employee") (Join-Path $repoRoot "backend\employee-service") 8082
Start-LoggedProcess "ticket-service" "java" @("-jar", "target\ticket-service-0.0.1-SNAPSHOT.jar", "--spring.datasource.url=$ticketDbJdbcUrl") (Join-Path $repoRoot "backend\ticket-service") 8083
Start-LoggedProcess "sla-service" "java" @("-jar", "target\sla-service-0.0.1-SNAPSHOT.jar") (Join-Path $repoRoot "backend\sla-service") 8084
Start-LoggedProcess "messaging-service" "java" @("-jar", "target\messaging-service-0.0.1-SNAPSHOT.jar", "--spring.datasource.url=$messagingDbJdbcUrl") (Join-Path $repoRoot "backend\messaging-service") 8086
Start-LoggedProcess "planning-service" "java" @("-jar", "target\planning-service-0.0.1-SNAPSHOT.jar", "--spring.datasource.url=$planningDbJdbcUrl", "--security.dev-admin-bypass=$($env:SECURITY_DEV_ADMIN_BYPASS)") (Join-Path $repoRoot "backend\planning-service") 8087

Wait-Port 8081 "auth-user-service"
Wait-Port 8082 "employee-service"
Wait-Port 8083 "ticket-service"
Wait-Port 8084 "sla-service"
Wait-Port 8086 "messaging-service"
Wait-Port 8087 "planning-service"

Start-LoggedProcess "api-gateway" "java" @("-jar", "target\api-gateway-0.0.1-SNAPSHOT.jar") (Join-Path $repoRoot "backend\api-gateway") 8080
Wait-Port 8080 "api-gateway"

Start-LoggedProcess "ai-service" (Join-Path $repoRoot "ai_service\.venv\Scripts\python.exe") @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001") (Join-Path $repoRoot "ai_service") 8001
Wait-Port 8001 "ai-service"

Start-LoggedProcess "frontend" "npm.cmd" @("run", "dev", "--", "--host", "127.0.0.1", "--port", "$FrontendPort") (Join-Path $repoRoot "FRONTCODED") $FrontendPort
Wait-Port $FrontendPort "frontend"

Write-Host ""
Write-Host "CGI-FLOW is running:"
Write-Host "  Frontend: http://127.0.0.1:$FrontendPort/"
Write-Host "  Keycloak: http://127.0.0.1:8085/"
Write-Host "  Eureka:   http://127.0.0.1:8761/"
Write-Host "  Planning: http://127.0.0.1:8087/api/plannings/health"
Write-Host "  AI:       http://127.0.0.1:8001/health"
Write-Host "  KPI app:  http://127.0.0.1:5180/kpi-app/"
Write-Host "  KPI API:  http://127.0.0.1:8080/api/kpi-platform/health"
Write-Host "Logs: $logRoot"
