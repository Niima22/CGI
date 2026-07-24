param(
    [ValidateSet("Smoke", "Load")]
    [string]$Mode = "Smoke",
    [string]$JMeterPath = "",
    [string]$PropertiesFile = "",
    [string]$Protocol = "http",
    [string]$KeycloakHost = "localhost",
    [int]$KeycloakPort = 8085,
    [string]$KeycloakRealm = "cgi-flow",
    [string]$KeycloakClientId = "cgi-flow-web",
    [string]$GatewayHost = "localhost",
    [int]$GatewayPort = 8080,
    [int]$TicketDepartmentId = 1,
    [int]$TicketKpiMaxMs = 60000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$PlanPath = Join-Path $ScriptDir "test-plan-tickets.jmx"
$DefaultPropertiesFile = Join-Path $ScriptDir "jmeter-local.properties"
if ([string]::IsNullOrWhiteSpace($PropertiesFile)) {
    $PropertiesFile = $DefaultPropertiesFile
}

function Resolve-JMeterExecutable {
    param([string]$RequestedPath)

    $candidates = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
        $candidates.Add($RequestedPath)
    }
    if ($env:JMETER_HOME) {
        $candidates.Add((Join-Path $env:JMETER_HOME "bin\jmeter.bat"))
    }
    foreach ($commandName in @("jmeter.bat", "jmeter.cmd", "jmeter")) {
        $command = Get-Command $commandName -ErrorAction SilentlyContinue
        if ($command) {
            $candidates.Add($command.Source)
        }
    }
    $downloadCandidates = @(
        (Join-Path $env:USERPROFILE "Downloads\apache-jmeter-5.6.3\bin\jmeter.bat"),
        (Join-Path $env:USERPROFILE "Downloads\apache-jmeter-5.6.3\apache-jmeter-5.6.3\bin\jmeter.bat"),
        (Join-Path $RepoRoot "apache-jmeter-5.6.3\bin\jmeter.bat")
    )
    foreach ($candidate in $downloadCandidates) {
        $candidates.Add($candidate)
    }

    foreach ($candidate in $candidates | Select-Object -Unique) {
        if ($candidate -and (Test-Path $candidate)) {
            return (Resolve-Path $candidate).Path
        }
    }

    throw "Apache JMeter executable not found. Pass -JMeterPath or set JMETER_HOME."
}

function Test-PropertyFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Missing JMeter local properties file: $Path. Create it from jmeter-local.properties.example and fill the Keycloak credentials."
    }

    $properties = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $properties[$parts[0].Trim()] = $parts[1]
        }
    }

    foreach ($required in @("keycloak.username", "keycloak.password")) {
        if (-not $properties.ContainsKey($required) -or [string]::IsNullOrWhiteSpace([string]$properties[$required])) {
            throw "Missing required property '$required' in $Path."
        }
    }
}

function Test-HttpEndpoint {
    param(
        [string]$Name,
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
        if ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500) {
            Write-Host "$Name reachable: HTTP $($response.StatusCode)"
            return
        }
        throw "$Name returned HTTP $($response.StatusCode)"
    } catch {
        throw "$Name is not reachable at $Url. $($_.Exception.Message)"
    }
}

function Test-RequiredServices {
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $docker) {
        throw "Docker CLI not found; cannot verify required containers."
    }

    $containerNames = @(docker ps --format "{{.Names}}")
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to list Docker containers."
    }

    foreach ($requiredContainer in @("cgi-flow-keycloak", "cgi-flow-auth-postgres")) {
        if ($containerNames -notcontains $requiredContainer) {
            throw "Required Docker container is not running: $requiredContainer"
        }
        Write-Host "Docker container running: $requiredContainer"
    }

    foreach ($optionalServiceContainer in @("cgi-flow-api-gateway", "cgi-flow-ticket-service")) {
        if ($containerNames -contains $optionalServiceContainer) {
            Write-Host "Docker container running: $optionalServiceContainer"
        } else {
            Write-Host "Docker container not running: $optionalServiceContainer; checking service endpoint instead."
        }
    }

    Test-HttpEndpoint `
        -Name "Keycloak realm metadata" `
        -Url "$Protocol`://$KeycloakHost`:$KeycloakPort/realms/$KeycloakRealm/.well-known/openid-configuration"
    Test-HttpEndpoint `
        -Name "Ticket health through API Gateway" `
        -Url "$Protocol`://$GatewayHost`:$GatewayPort/api/tickets/health"
}

function Invoke-JMeterPlan {
    param(
        [string]$JMeterExecutable,
        [string]$RunName,
        [string]$RunId,
        [int]$Threads,
        [int]$RampUp,
        [int]$Loops,
        [string]$OutputRoot
    )

    $runDir = Join-Path $OutputRoot $RunName
    $htmlDir = Join-Path $runDir "html"
    New-Item -ItemType Directory -Force -Path $runDir, $htmlDir | Out-Null

    $jtlPath = Join-Path $runDir "$RunName.jtl"
    $jmeterLog = Join-Path $runDir "jmeter.log"

    $arguments = @(
        "-n",
        "-t", $PlanPath,
        "-q", $PropertiesFile,
        "-l", $jtlPath,
        "-j", $jmeterLog,
        "-e",
        "-o", $htmlDir,
        "-Jprotocol=$Protocol",
        "-Jkeycloak.host=$KeycloakHost",
        "-Jkeycloak.port=$KeycloakPort",
        "-Jkeycloak.realm=$KeycloakRealm",
        "-Jkeycloak.client_id=$KeycloakClientId",
        "-Jgateway.host=$GatewayHost",
        "-Jgateway.port=$GatewayPort",
        "-Jtickets.path=/api/tickets",
        "-Jticket.department_id=$TicketDepartmentId",
        "-Jticket.kpi.max_ms=$TicketKpiMaxMs",
        "-Jticket.run_id=$RunId",
        "-Jticket.threads=$Threads",
        "-Jticket.ramp_up=$RampUp",
        "-Jticket.loops=$Loops"
    )

    Write-Host "Running JMeter $RunName ($Threads thread(s), ramp-up $RampUp second(s), loops $Loops)..."
    $jmeterOutput = & $JMeterExecutable @arguments 2>&1
    $jmeterExitCode = $LASTEXITCODE
    $jmeterOutput | ForEach-Object { Write-Host $_ }
    if ($jmeterExitCode -ne 0) {
        throw "JMeter failed for $RunName. See $jmeterLog"
    }

    return [pscustomobject]@{
        RunDir = $runDir
        Jtl = $jtlPath
        Html = Join-Path $htmlDir "index.html"
        Log = $jmeterLog
    }
}

function Assert-JMeterResults {
    param(
        [string]$JtlPath,
        [string]$RunName
    )

    if (-not (Test-Path $JtlPath)) {
        throw "Missing JMeter result file: $JtlPath"
    }

    $rows = @(Import-Csv $JtlPath)
    if ($rows.Count -eq 0) {
        throw "JMeter result file is empty: $JtlPath"
    }

    $tokenRows = @($rows | Where-Object { $_.label -eq "Keycloak - password token" })
    $ticketRows = @($rows | Where-Object { $_.label -eq "Tickets - POST /api/tickets" })
    $authFailureRows = @($rows | Where-Object { $_.label -eq "Authentication failure - access_token missing" })

    if ($tokenRows.Count -eq 0) {
        throw "No Keycloak token sample found in $RunName results."
    }
    if ($authFailureRows.Count -gt 0) {
        throw "Authentication failed in $RunName; access_token was not extracted."
    }
    if ($ticketRows.Count -eq 0) {
        throw "No ticket creation sample found in $RunName results."
    }

    $failedRows = @($rows | Where-Object { $_.success -ne "true" })
    $badTokenRows = @($tokenRows | Where-Object { $_.responseCode -ne "200" -or $_.success -ne "true" })
    $badTicketRows = @($ticketRows | Where-Object { $_.responseCode -ne "201" -or $_.success -ne "true" })

    Write-Host "Keycloak token samples: $($tokenRows.Count); response codes: $((@($tokenRows | Select-Object -ExpandProperty responseCode -Unique) -join ', '))"
    Write-Host "Ticket creation samples: $($ticketRows.Count); response codes: $((@($ticketRows | Select-Object -ExpandProperty responseCode -Unique) -join ', '))"

    if ($badTokenRows.Count -gt 0) {
        throw "At least one Keycloak token request failed in $RunName."
    }
    if ($badTicketRows.Count -gt 0) {
        throw "At least one ticket creation request failed in $RunName."
    }
    if ($failedRows.Count -gt 0) {
        throw "$($failedRows.Count) JMeter sample(s) failed in $RunName."
    }
}

function Assert-TicketInserted {
    param([string]$RunId)

    $containerNames = @(docker ps --format "{{.Names}}")
    if ($containerNames -notcontains "cgi-flow-auth-postgres") {
        throw "Cannot verify PostgreSQL insert; cgi-flow-auth-postgres is not running."
    }

    $safeRunId = $RunId.Replace("'", "''")
    $sql = "SELECT id, reference FROM tickets WHERE title LIKE 'Timeout API partenaires - $safeRunId%' ORDER BY id DESC LIMIT 1;"
    foreach ($database in @("cgi_flow_ticket", "cgi_flow_auth")) {
        $result = docker exec cgi-flow-auth-postgres psql -U postgres -d $database -t -A -F "|" -c $sql 2>$null
        if ($LASTEXITCODE -ne 0) {
            continue
        }
        $line = @($result | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)
        if ($line) {
            $parts = $line.Split("|")
            Write-Host "PostgreSQL ticket insert verified in $database.public.tickets: id=$($parts[0]), reference=$($parts[1])"
            return
        }
    }
    throw "No ticket row found in PostgreSQL for run id $RunId."
}

Push-Location $RepoRoot
try {
    $jmeter = Resolve-JMeterExecutable -RequestedPath $JMeterPath
    Write-Host "Using JMeter executable: $jmeter"

    Test-PropertyFile -Path $PropertiesFile
    Test-RequiredServices

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $outputRoot = Join-Path $ScriptDir "reports\tickets-$timestamp"
    New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

    $smokeRunId = "smoke-$timestamp"
    $smoke = Invoke-JMeterPlan `
        -JMeterExecutable $jmeter `
        -RunName "smoke" `
        -RunId $smokeRunId `
        -Threads 1 `
        -RampUp 1 `
        -Loops 1 `
        -OutputRoot $outputRoot
    Assert-JMeterResults -JtlPath $smoke.Jtl -RunName "smoke"
    Assert-TicketInserted -RunId $smokeRunId
    Write-Host "Smoke test succeeded. HTML report: $($smoke.Html)"

    if ($Mode -eq "Load") {
        $loadRunId = "load-$timestamp"
        $load = Invoke-JMeterPlan `
            -JMeterExecutable $jmeter `
            -RunName "load-50-users" `
            -RunId $loadRunId `
            -Threads 50 `
            -RampUp 30 `
            -Loops 1 `
            -OutputRoot $outputRoot
        Assert-JMeterResults -JtlPath $load.Jtl -RunName "load-50-users"
        Assert-TicketInserted -RunId $loadRunId
        Write-Host "Load test succeeded. HTML report: $($load.Html)"
    } else {
        Write-Host "Load mode was not requested. The 50-user configuration is ready but was not executed."
    }
} finally {
    Pop-Location
}
