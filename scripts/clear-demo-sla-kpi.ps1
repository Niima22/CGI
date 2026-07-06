$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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
if (-not $env:SPRING_DATASOURCE_PASSWORD) {
    $env:SPRING_DATASOURCE_PASSWORD = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "postgres" }
}

$demoPolicyNames = @(
    "Incident critique",
    "Incident standard",
    "Demande faible priorité"
)

$existingDemoTickets = @(
    Invoke-PostgresQuery `
        $env:TICKET_DB_NAME `
        "select reference from tickets where reference like 'DEMO-KPI-%' order by reference;" `
        -Raw
) | Where-Object { $_.Trim() }

Write-Host "Clearing local demo SLA/KPI data..."
Write-Host "Demo tickets found: $($existingDemoTickets.Count)"

$clearSql = @"
DELETE FROM ticket_history
WHERE ticket_id IN (
    SELECT id FROM tickets WHERE reference LIKE 'DEMO-KPI-%'
);

DELETE FROM ticket_sla
WHERE ticket_id IN (
    SELECT id FROM tickets WHERE reference LIKE 'DEMO-KPI-%'
);

DELETE FROM tickets
WHERE reference LIKE 'DEMO-KPI-%';

DELETE FROM sla_policies
WHERE name IN (
    'Incident critique',
    'Incident standard',
    U&'Demande faible priorit\00E9'
);
"@

Invoke-PostgresQuery $env:TICKET_DB_NAME $clearSql | Out-Null

$remainingDemoTickets = Invoke-PostgresQuery `
    $env:TICKET_DB_NAME `
    "select count(*) from tickets where reference like 'DEMO-KPI-%';" `
    -Raw

$remainingDemoPolicies = @(
    Invoke-PostgresQuery `
        $env:TICKET_DB_NAME `
        "select name from sla_policies where name in ('Incident critique', 'Incident standard', U&'Demande faible priorit\00E9') order by name;" `
        -Raw
) | Where-Object { $_.Trim() }

Write-Host "Removed demo ticket history, SLA rows, and demo tickets matching DEMO-KPI-*."
Write-Host "Removed only exact demo policies:"
foreach ($policyName in $demoPolicyNames) {
    Write-Host "  - $policyName"
}
Write-Host "Remaining demo tickets: $($remainingDemoTickets.Trim())"

if ($remainingDemoPolicies.Count -eq 0) {
    Write-Host "Remaining exact demo policies: 0"
} else {
    Write-Host "Remaining exact demo policies:"
    $remainingDemoPolicies | ForEach-Object { Write-Host "  - $($_.Trim())" }
}

Write-Host "Local demo SLA/KPI cleanup complete."
