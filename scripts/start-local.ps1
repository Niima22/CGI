# Lightweight local launcher: runs core Spring Boot jars against the Docker infra
# (auth-postgres + keycloak already up). No full docker-compose, no KPI/AI.
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $repoRoot ".run"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

# Defaults in each service's application.yml already point at the local infra
# (postgres :55432, keycloak :8085, eureka :8761), so no extra env is required.
$env:SPRING_DATASOURCE_USERNAME = "postgres"
$env:SPRING_DATASOURCE_PASSWORD = "postgres"
$env:KEYCLOAK_ISSUER_URI = "http://localhost:8085/realms/cgi-flow"
$env:KEYCLOAK_AUTH_SERVER_URL = "http://localhost:8085"
$env:KEYCLOAK_ADMIN_USERNAME = "admin"
$env:KEYCLOAK_ADMIN_PASSWORD = "admin"
$env:EUREKA_DEFAULT_ZONE = "http://localhost:8761/eureka"
$env:SECURITY_DEV_ADMIN_BYPASS = "false"
# Keycloak issues tokens with aud=account; planning-service validates the audience.
$env:KEYCLOAK_AUDIENCE = "account"

function Start-Svc {
    param([string]$Name, [string]$Dir, [string]$Jar, [string[]]$ExtraArgs = @())
    $out = Join-Path $logRoot "$Name.out.log"
    $err = Join-Path $logRoot "$Name.err.log"
    Write-Host "Starting $Name..."
    Start-Process -FilePath "java" -ArgumentList (@("-jar", "target\$Jar") + $ExtraArgs) `
        -WorkingDirectory (Join-Path $repoRoot "backend\$Dir") `
        -RedirectStandardOutput $out -RedirectStandardError $err `
        -WindowStyle Hidden | Out-Null
}

# Explicit per-service datasource URLs (each service owns its own DB) so no
# ambient SPRING_DATASOURCE_URL can misroute a service to the wrong database.
$pg = "jdbc:postgresql://127.0.0.1:55432"

function Wait-Port {
    param([int]$Port, [string]$Name, [int]$TimeoutSeconds = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $l = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($l) { Write-Host "$Name listening on $Port."; return }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "$Name did not start on port $Port within $TimeoutSeconds s."
}

function Stop-Port {
    param([int]$Port)
    $l = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($l) {
        $l | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            try { Stop-Process -Id $_ -Force -ErrorAction Stop } catch {}
        }
    }
}

foreach ($p in 8761, 8081, 8082, 8083, 8084, 8086, 8087, 8080) { Stop-Port $p }

Start-Svc "discovery-service" "discovery-service" "discovery-service-0.0.1-SNAPSHOT.jar"
Wait-Port 8761 "discovery-service"

Start-Svc "auth-user-service" "auth-user-service" "auth-user-service-0.0.1-SNAPSHOT.jar" @("--spring.datasource.url=$pg/cgi_flow_auth")
Wait-Port 8081 "auth-user-service" 150

Start-Svc "employee-service" "employee-service" "employee-service-0.0.1-SNAPSHOT.jar" @("--spring.datasource.url=$pg/cgi_flow_employee")
Start-Svc "ticket-service" "ticket-service" "ticket-service-0.0.1-SNAPSHOT.jar" @("--spring.datasource.url=$pg/cgi_flow_ticket")
Start-Svc "sla-service" "sla-service" "sla-service-0.0.1-SNAPSHOT.jar"
Start-Svc "messaging-service" "messaging-service" "messaging-service-0.0.1-SNAPSHOT.jar" @("--spring.datasource.url=$pg/cgi_flow_messaging")
Start-Svc "planning-service" "planning-service" "planning-service-0.0.1-SNAPSHOT.jar" @("--spring.datasource.url=$pg/cgi_flow_planning")
Wait-Port 8082 "employee-service" 150
Wait-Port 8083 "ticket-service" 150
Wait-Port 8084 "sla-service" 150
Wait-Port 8087 "planning-service" 150

Start-Svc "api-gateway" "api-gateway" "api-gateway-0.0.1-SNAPSHOT.jar"
Wait-Port 8080 "api-gateway" 150

Write-Host "CORE BACKEND UP: gateway http://localhost:8080  eureka http://localhost:8761"
