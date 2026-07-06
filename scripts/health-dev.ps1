$ErrorActionPreference = "Continue"

$checks = @(
    @{ Name = "frontend"; Url = "http://127.0.0.1:5173/" },
    @{ Name = "ai-service"; Url = "http://127.0.0.1:8001/health" },
    @{ Name = "eureka"; Url = "http://127.0.0.1:8761/" },
    @{ Name = "auth-user-service"; Url = "http://127.0.0.1:8081/api/auth/health" },
    @{ Name = "employee-service"; Url = "http://127.0.0.1:8082/api/employees/health" },
    @{ Name = "ticket-service"; Url = "http://127.0.0.1:8083/api/tickets/health" },
    @{ Name = "sla-service"; Url = "http://127.0.0.1:8084/api/sla/health" }
)

function Test-ExpectedStatus {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][int]$ExpectedStatus,
        [string]$ContentType,
        [string]$Body
    )

    try {
        $params = @{
            UseBasicParsing = $true
            Method = $Method
            Uri = $Url
            TimeoutSec = 5
        }
        if ($ContentType) {
            $params.ContentType = $ContentType
        }
        if ($Body) {
            $params.Body = $Body
        }
        $response = Invoke-WebRequest @params
        if ([int]$response.StatusCode -eq $ExpectedStatus) {
            Write-Host ("{0}: {1}" -f $Name, $response.StatusCode)
        } else {
            Write-Host ("{0}: FAILED (expected {1}, got {2})" -f $Name, $ExpectedStatus, $response.StatusCode)
        }
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            if ($status -eq $ExpectedStatus) {
                Write-Host ("{0}: {1}" -f $Name, $status)
            } else {
                Write-Host ("{0}: FAILED (expected {1}, got {2})" -f $Name, $ExpectedStatus, $status)
            }
        } else {
            Write-Host ("{0}: FAILED ({1})" -f $Name, $_.Exception.Message)
        }
    }
}

foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing $check.Url -TimeoutSec 5
        Write-Host ("{0}: {1}" -f $check.Name, $response.StatusCode)
    } catch {
        Write-Host ("{0}: FAILED ({1})" -f $check.Name, $_.Exception.Message)
    }
}

Test-ExpectedStatus "auth-me-contract" "GET" "http://127.0.0.1:8081/api/auth/me" 401
Test-ExpectedStatus "auth-audit-endpoint" "GET" "http://127.0.0.1:8081/api/auth/audit-logs" 401
Test-ExpectedStatus "employee-availability-endpoint" "PATCH" "http://127.0.0.1:8082/api/employees/me/availability-status" 401 "application/json" '{"availabilityStatus":"BREAK"}'
