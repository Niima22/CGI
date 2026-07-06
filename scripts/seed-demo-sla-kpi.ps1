$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Local demo only.
# This script prepares SLA/KPI validation data for a local dev stack.
# Reset it with scripts\clear-demo-sla-kpi.ps1.
# Do not treat the generated records as production-like business data.

$repoRoot = Split-Path -Parent $PSScriptRoot

function Invoke-PostgresQuery {
    param(
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$Sql,
        [switch]$Raw
    )

    $driverJar = Get-ChildItem "$env:USERPROFILE\.m2\repository\org\postgresql\postgresql" `
        -Recurse `
        -Filter "postgresql-*.jar" | Where-Object { $_.Name -notlike "*-sources.jar" } |
        Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName

    if (-not $driverJar) {
        throw "PostgreSQL JDBC driver was not found in the local Maven repository."
    }

    $runnerPath = Join-Path $repoRoot ".run\DbSqlRunner.java"
    if (-not (Test-Path $runnerPath)) {
        @'
import java.sql.*;

public class DbSqlRunner {
    public static void main(String[] args) throws Exception {
        if (args.length < 4) {
            throw new IllegalArgumentException("Usage: DbSqlRunner <url> <username> <password> <sql>");
        }

        String url = args[0];
        String username = args[1];
        String password = args[2];
        String sql = args[3];

        try (Connection connection = DriverManager.getConnection(url, username, password);
             Statement statement = connection.createStatement()) {
            boolean hasResultSet = statement.execute(sql);
            if (hasResultSet) {
                try (ResultSet resultSet = statement.getResultSet()) {
                    ResultSetMetaData metaData = resultSet.getMetaData();
                    int columnCount = metaData.getColumnCount();
                    while (resultSet.next()) {
                        StringBuilder row = new StringBuilder();
                        for (int index = 1; index <= columnCount; index++) {
                            if (index > 1) {
                                row.append("|");
                            }
                            Object value = resultSet.getObject(index);
                            row.append(value == null ? "" : value.toString());
                        }
                        System.out.println(row);
                    }
                }
            }
        }
    }
}
'@ | Set-Content -Path $runnerPath -Encoding Ascii
    }

    $jdbcUrl = "jdbc:postgresql://$($env:TICKET_DB_HOST):$($env:TICKET_DB_PORT)/$Database"
    $output = & java --class-path $driverJar $runnerPath $jdbcUrl "postgres" $env:SPRING_DATASOURCE_PASSWORD $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed for database '$Database'."
    }
    if ($Raw) {
        return $output
    }
    return $output
}

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

        [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim().Trim('"').Trim("'"), "Process")
    }
}

Import-DotEnv (Join-Path $repoRoot ".env")

if (-not $env:TICKET_DB_HOST) {
    $env:TICKET_DB_HOST = "127.0.0.1"
}
if (-not $env:TICKET_DB_PORT) {
    $env:TICKET_DB_PORT = "55432"
}
if (-not $env:TICKET_DB_NAME) {
    $env:TICKET_DB_NAME = "cgi_flow_auth"
}
if (-not $env:AUTH_DB_NAME) {
    $env:AUTH_DB_NAME = "cgi_flow_auth"
}
if (-not $env:SPRING_DATASOURCE_PASSWORD) {
    $env:SPRING_DATASOURCE_PASSWORD = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "postgres" }
}

$adminId = (Invoke-PostgresQuery $env:AUTH_DB_NAME "select id from user_profiles where email = 'pilote@cgi.local' limit 1;" -Raw | Select-Object -First 1).Trim()
$managerId = (Invoke-PostgresQuery $env:AUTH_DB_NAME "select id from user_profiles where email = 'superviseur@cgi.local' limit 1;" -Raw | Select-Object -First 1).Trim()
$employeeId = (Invoke-PostgresQuery $env:AUTH_DB_NAME "select id from user_profiles where email = 'agent@cgi.local' limit 1;" -Raw | Select-Object -First 1).Trim()

if (-not $adminId -or -not $managerId -or -not $employeeId) {
    throw "Required local auth demo users were not found in cgi_flow_auth.user_profiles."
}

$seedSql = @"
UPDATE sla_policies
SET incident_type = 'INCIDENT',
    priority = 'URGENT',
    criticality = 'CRITICAL',
    response_time_minutes = 15,
    resolution_time_minutes = 240,
    warning_threshold_percent = 80,
    active = true,
    updated_at = now()
WHERE name = 'Incident critique';

INSERT INTO sla_policies (
    name, incident_type, priority, criticality, response_time_minutes, resolution_time_minutes,
    warning_threshold_percent, active, created_at, updated_at
)
SELECT
    'Incident critique', 'INCIDENT', 'URGENT', 'CRITICAL', 15, 240, 80, true, now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM sla_policies WHERE name = 'Incident critique'
);

UPDATE sla_policies
SET incident_type = 'INCIDENT',
    priority = 'MEDIUM',
    criticality = 'MEDIUM',
    response_time_minutes = 60,
    resolution_time_minutes = 480,
    warning_threshold_percent = 80,
    active = true,
    updated_at = now()
WHERE name = 'Incident standard';

INSERT INTO sla_policies (
    name, incident_type, priority, criticality, response_time_minutes, resolution_time_minutes,
    warning_threshold_percent, active, created_at, updated_at
)
SELECT
    'Incident standard', 'INCIDENT', 'MEDIUM', 'MEDIUM', 60, 480, 80, true, now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM sla_policies WHERE name = 'Incident standard'
);

UPDATE sla_policies
SET incident_type = 'REQUEST',
    priority = 'LOW',
    criticality = 'LOW',
    response_time_minutes = 240,
    resolution_time_minutes = 1440,
    warning_threshold_percent = 80,
    active = true,
    updated_at = now()
WHERE name = U&'Demande faible priorit\00E9';

DELETE FROM sla_policies
WHERE name LIKE 'Demande faible priorit%'
  AND name <> U&'Demande faible priorit\00E9';

INSERT INTO sla_policies (
    name, incident_type, priority, criticality, response_time_minutes, resolution_time_minutes,
    warning_threshold_percent, active, created_at, updated_at
)
SELECT
    U&'Demande faible priorit\00E9', 'REQUEST', 'LOW', 'LOW', 240, 1440, 80, true, now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM sla_policies WHERE name = U&'Demande faible priorit\00E9'
);

INSERT INTO tickets (
    reference, title, description, status, type, category, sub_category, priority, criticality,
    requester_id, assigned_user_id, assigned_team_id, department_id, created_at, updated_at,
    assigned_at, started_at, resolved_at, closed_at, deleted, deleted_at
) VALUES
(
    'DEMO-KPI-001',
    U&'Demo critique d\00E9passe SLA',
    U&'Ticket local de d\00E9monstration pour un incident critique d\00E9j\00E0 d\00E9pass\00E9.',
    'IN_PROGRESS', 'INCIDENT', 'DEMO', 'SLA', 'URGENT', 'CRITICAL',
    $adminId, $managerId, null, 1,
    now() - interval '6 hours', now(),
    now() - interval '5 hours 55 minutes', now() - interval '5 hours 50 minutes',
    null, null, false, null
),
(
    'DEMO-KPI-002',
    'Demo incident en risque SLA',
    U&'Ticket local de d\00E9monstration pour un incident standard proche du d\00E9passement.',
    'ASSIGNED', 'INCIDENT', 'DEMO', 'SLA', 'MEDIUM', 'MEDIUM',
    $adminId, $managerId, null, 1,
    now() - interval '7 hours', now(),
    now() - interval '6 hours 50 minutes', null,
    null, null, false, null
),
(
    'DEMO-KPI-003',
    'Demo incident en cours',
    U&'Ticket local de d\00E9monstration en cours de traitement pour l''agent.',
    'IN_PROGRESS', 'INCIDENT', 'DEMO', 'KPI', 'MEDIUM', 'MEDIUM',
    $employeeId, $employeeId, null, 1,
    now() - interval '2 hours', now(),
    now() - interval '1 hour 55 minutes', now() - interval '1 hour 50 minutes',
    null, null, false, null
),
(
    'DEMO-KPI-004',
    'Demo attente demandeur',
    U&'Ticket local de d\00E9monstration actuellement en attente demandeur.',
    'WAITING_REQUESTER', 'INCIDENT', 'DEMO', 'KPI', 'MEDIUM', 'MEDIUM',
    $employeeId, $employeeId, null, 1,
    now() - interval '3 hours 20 minutes', now(),
    now() - interval '3 hours 15 minutes', now() - interval '3 hours 10 minutes',
    null, null, false, null
),
(
    'DEMO-KPI-005',
    U&'Demo r\00E9solution respect\00E9e',
    U&'Ticket local de d\00E9monstration r\00E9solu dans les d\00E9lais.',
    'RESOLVED', 'REQUEST', 'DEMO', 'KPI', 'LOW', 'LOW',
    $employeeId, $employeeId, null, 1,
    now() - interval '5 hours', now(),
    now() - interval '4 hours 40 minutes', now() - interval '4 hours 30 minutes',
    now() - interval '1 hour', null, false, null
),
(
    'DEMO-KPI-006',
    U&'Demo cl\00F4ture respect\00E9e',
    U&'Ticket local de d\00E9monstration cl\00F4tur\00E9 dans les d\00E9lais.',
    'CLOSED', 'REQUEST', 'DEMO', 'KPI', 'LOW', 'LOW',
    $managerId, $managerId, null, 1,
    now() - interval '10 hours', now(),
    now() - interval '9 hours 50 minutes', now() - interval '9 hours 40 minutes',
    now() - interval '4 hours', now() - interval '3 hours', false, null
),
(
    'DEMO-KPI-007',
    U&'Demo r\00E9solution d\00E9pass\00E9e',
    U&'Ticket local de d\00E9monstration r\00E9solu hors d\00E9lai pour alimenter la productivit\00E9.',
    'RESOLVED', 'INCIDENT', 'DEMO', 'KPI', 'MEDIUM', 'MEDIUM',
    $employeeId, $employeeId, null, 1,
    now() - interval '12 hours', now(),
    now() - interval '11 hours 50 minutes', now() - interval '11 hours 45 minutes',
    now() - interval '2 hours', null, false, null
),
(
    'DEMO-KPI-008',
    U&'Demo ticket assign\00E9 standard',
    U&'Ticket local de d\00E9monstration assign\00E9 avec SLA encore respect\00E9.',
    'ASSIGNED', 'INCIDENT', 'DEMO', 'KPI', 'MEDIUM', 'MEDIUM',
    $managerId, $managerId, null, 1,
    now() - interval '30 minutes', now(),
    now() - interval '25 minutes', null,
    null, null, false, null
)
ON CONFLICT (reference) DO UPDATE
SET title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    type = excluded.type,
    category = excluded.category,
    sub_category = excluded.sub_category,
    priority = excluded.priority,
    criticality = excluded.criticality,
    requester_id = excluded.requester_id,
    assigned_user_id = excluded.assigned_user_id,
    assigned_team_id = excluded.assigned_team_id,
    department_id = excluded.department_id,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    assigned_at = excluded.assigned_at,
    started_at = excluded.started_at,
    resolved_at = excluded.resolved_at,
    closed_at = excluded.closed_at,
    deleted = false,
    deleted_at = null;

DELETE FROM ticket_history
WHERE ticket_id IN (
    SELECT id FROM tickets WHERE reference LIKE 'DEMO-KPI-%'
);

DELETE FROM ticket_sla
WHERE ticket_id IN (
    SELECT id FROM tickets WHERE reference LIKE 'DEMO-KPI-%'
);
"@

Invoke-PostgresQuery $env:TICKET_DB_NAME $seedSql | Out-Null

$body = @{
    grant_type = "password"
    client_id = "cgi-flow-web"
    username = "pilote@cgi.local"
    password = (Get-Content (Join-Path $repoRoot ".run\dev-credentials.txt") | Select-String -Pattern '^Password: ' -Context 0,0 | Select-Object -First 1 | ForEach-Object { $_.Line.Substring(10) })
}

if (-not $body.password) {
    throw "Unable to read the local admin password from .run\\dev-credentials.txt."
}

$token = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:8085/realms/cgi-flow/protocol/openid-connect/token" `
    -Body $body `
    -ContentType "application/x-www-form-urlencoded"

$headers = @{ Authorization = "Bearer $($token.access_token)" }

$demoTicketIds = Invoke-PostgresQuery `
    $env:TICKET_DB_NAME `
    "select id from tickets where reference like 'DEMO-KPI-%' order by reference;" `
    -Raw

foreach ($ticketId in $demoTicketIds) {
    if (-not $ticketId) {
        continue
    }
    Invoke-RestMethod `
        -Method Post `
        -Uri "http://127.0.0.1:8080/api/sla/tickets/$($ticketId.Trim())/recalculate" `
        -Headers $headers | Out-Null
}

Write-Host "Seeded local demo SLA policies and demo KPI tickets."
Write-Host "Assigned users:"
Write-Host "  MANAGER -> user profile id $managerId"
Write-Host "  EMPLOYEE -> user profile id $employeeId"
Write-Host "Demo references:"
Invoke-PostgresQuery `
    $env:TICKET_DB_NAME `
    "select reference || ' | ' || status || ' | assigned_user_id=' || assigned_user_id from tickets where reference like 'DEMO-KPI-%' order by reference;"
