param(
    [string]$KeycloakUrl = "http://localhost:8085",
    [string]$Realm = "cgi-flow",
    [string]$ClientId = "cgi-flow-web",
    [string]$AdminRealm = "master",
    [string]$AdminClientId = "admin-cli",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "admin",
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$AuthServiceUrl = "http://localhost:8081",
    [string]$EmployeeServiceUrl = "http://localhost:8082",
    [string]$CredentialsPath = ".run/dev-credentials.txt"
)

$ErrorActionPreference = "Stop"

$Users = @(
    @{ Email = "pilote@cgi.local"; FullName = "Pilote CGI"; Role = "ADMIN" },
    @{ Email = "superviseur@cgi.local"; FullName = "Superviseur CGI"; Role = "MANAGER" },
    @{ Email = "agent@cgi.local"; FullName = "Agent CGI"; Role = "EMPLOYEE" }
)

$LocalRedirectUris = @(
    "http://localhost:5173/*",
    "http://127.0.0.1:5173/*"
)

$LocalWebOrigins = @(
    "http://localhost:5173",
    "http://127.0.0.1:5173"
)

function Join-Url([string]$Base, [string]$Path) {
    return $Base.TrimEnd("/") + "/" + $Path.TrimStart("/")
}

function New-LocalPassword {
    $bytes = [byte[]]::new(24)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    return ([Convert]::ToBase64String($bytes).TrimEnd("=") + "aA1!")
}

function Invoke-Json {
    param(
        [ValidateSet("Get", "Post", "Put", "Delete")]
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        $Body = $null,
        [string]$ContentType = "application/json"
    )

    $params = @{
        Method = $Method
        Uri = $Uri
        Headers = $Headers
    }

    if ($null -ne $Body) {
        $params.Body = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 20 }
        $params.ContentType = $ContentType
    }

    try {
        return Invoke-RestMethod @params
    } catch {
        throw "Request failed: $Method $Uri. $($_.Exception.Message)"
    }
}

function Invoke-OptionalJson {
    param(
        [ValidateSet("Get", "Post", "Put", "Delete")]
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    try {
        return Invoke-Json -Method $Method -Uri $Uri -Headers $Headers -Body $Body
    } catch {
        return $null
    }
}

function Get-AdminToken {
    $tokenUrl = Join-Url $KeycloakUrl "/realms/$AdminRealm/protocol/openid-connect/token"
    $body = @{
        client_id = $AdminClientId
        grant_type = "password"
        username = $AdminUsername
        password = $AdminPassword
    }
    $response = Invoke-RestMethod -Method Post -Uri $tokenUrl -ContentType "application/x-www-form-urlencoded" -Body $body
    return $response.access_token
}

function Get-UsableAdminToken {
    try {
        return Get-AdminToken
    } catch {
        $temporaryAdmin = New-TemporaryAdmin
        if ($null -eq $temporaryAdmin) {
            throw "Unable to authenticate to Keycloak admin API. Pass -AdminUsername/-AdminPassword or start the local Docker Keycloak container."
        }
        $script:AdminUsername = $temporaryAdmin.Username
        $script:AdminPassword = $temporaryAdmin.Password
        return Get-AdminToken
    }
}

function New-TemporaryAdmin {
    try {
        $container = docker ps --filter "name=cgi-flow-keycloak" --format "{{.Names}}" | Select-Object -First 1
        if (-not $container) {
            return $null
        }

        $tempUsername = "local-seed-admin-" + (Get-Random)
        $tempPassword = New-LocalPassword
        docker compose stop keycloak | Out-Null
        docker run --rm --volumes-from cgi-flow-keycloak -e KC_BOOTSTRAP_ADMIN_PASSWORD=$tempPassword quay.io/keycloak/keycloak:26.6.3 bootstrap-admin user --username $tempUsername --password:env KC_BOOTSTRAP_ADMIN_PASSWORD --no-prompt | Out-Null
        docker compose up -d keycloak | Out-Null
        Wait-LocalEndpoint -Url (Join-Url $KeycloakUrl "/realms/$AdminRealm/.well-known/openid-configuration") -TimeoutSeconds 90 | Out-Null
        return @{
            Username = $tempUsername
            Password = $tempPassword
        }
    } catch {
        docker compose up -d keycloak | Out-Null
        return $null
    }
}

function Get-UserToken([string]$Username, [string]$Password) {
    $tokenUrl = Join-Url $KeycloakUrl "/realms/$Realm/protocol/openid-connect/token"
    $body = @{
        client_id = $ClientId
        grant_type = "password"
        username = $Username
        password = $Password
    }
    $response = Invoke-RestMethod -Method Post -Uri $tokenUrl -ContentType "application/x-www-form-urlencoded" -Body $body
    return $response.access_token
}

function Ensure-Realm([string]$Token) {
    $headers = @{ Authorization = "Bearer $Token" }
    $realmUrl = Join-Url $KeycloakUrl "/admin/realms/$Realm"
    $realmInfo = Invoke-OptionalJson -Method Get -Uri $realmUrl -Headers $headers
    if ($null -eq $realmInfo) {
        Invoke-Json -Method Post -Uri (Join-Url $KeycloakUrl "/admin/realms") -Headers $headers -Body @{
            realm = $Realm
            enabled = $true
            displayName = "CGI-FLOW Local"
        } | Out-Null
    } elseif (-not $realmInfo.enabled) {
        $realmInfo.enabled = $true
        Invoke-Json -Method Put -Uri $realmUrl -Headers $headers -Body $realmInfo | Out-Null
    }
}

function Ensure-Client([string]$Token) {
    $headers = @{ Authorization = "Bearer $Token" }
    $clientsUrl = Join-Url $KeycloakUrl "/admin/realms/$Realm/clients"
    $clients = Invoke-Json -Method Get -Uri ($clientsUrl + "?clientId=$ClientId") -Headers $headers

    if ($clients.Count -eq 0) {
        Invoke-Json -Method Post -Uri $clientsUrl -Headers $headers -Body @{
            clientId = $ClientId
            name = "CGI-FLOW Web"
            protocol = "openid-connect"
            publicClient = $true
            enabled = $true
            standardFlowEnabled = $true
            directAccessGrantsEnabled = $true
            redirectUris = $LocalRedirectUris
            webOrigins = $LocalWebOrigins
        } | Out-Null
        return
    }

    $client = $clients[0]
    $client.publicClient = $true
    $client.enabled = $true
    $client.standardFlowEnabled = $true
    $client.directAccessGrantsEnabled = $true
    $client.redirectUris = $LocalRedirectUris
    $client.webOrigins = $LocalWebOrigins
    Invoke-Json -Method Put -Uri (Join-Url $KeycloakUrl "/admin/realms/$Realm/clients/$($client.id)") -Headers $headers -Body $client | Out-Null
}

function Ensure-RealmRole([string]$Token, [string]$Role) {
    $headers = @{ Authorization = "Bearer $Token" }
    $roleUrl = Join-Url $KeycloakUrl "/admin/realms/$Realm/roles/$Role"
    $roleInfo = Invoke-OptionalJson -Method Get -Uri $roleUrl -Headers $headers
    if ($null -eq $roleInfo) {
        Invoke-Json -Method Post -Uri (Join-Url $KeycloakUrl "/admin/realms/$Realm/roles") -Headers $headers -Body @{
            name = $Role
            description = "CGI-FLOW technical role"
        } | Out-Null
    }
}

function Get-RealmRole([string]$Token, [string]$Role) {
    return Invoke-Json -Method Get -Uri (Join-Url $KeycloakUrl "/admin/realms/$Realm/roles/$Role") -Headers @{ Authorization = "Bearer $Token" }
}

function Find-KeycloakUser([string]$Token, [string]$Email) {
    $headers = @{ Authorization = "Bearer $Token" }
    $usersUrl = Join-Url $KeycloakUrl "/admin/realms/$Realm/users"
    $encodedEmail = [System.Uri]::EscapeDataString($Email)
    $byUsername = @(Invoke-Json -Method Get -Uri ($usersUrl + "?username=$encodedEmail&exact=true") -Headers $headers)
    if ($byUsername.Count -gt 0 -and $byUsername[0].id) {
        return $byUsername[0]
    }

    $byEmail = @(Invoke-Json -Method Get -Uri ($usersUrl + "?email=$encodedEmail&exact=true") -Headers $headers)
    if ($byEmail.Count -gt 0 -and $byEmail[0].id) {
        return $byEmail[0]
    }

    return $null
}

function Ensure-User([string]$Token, [hashtable]$User, [string]$Password) {
    $headers = @{ Authorization = "Bearer $Token" }
    $usersUrl = Join-Url $KeycloakUrl "/admin/realms/$Realm/users"
    $existingUser = Find-KeycloakUser -Token $Token -Email $User.Email
    $nameParts = $User.FullName.Split([string[]]@(" "), 2, [System.StringSplitOptions]::RemoveEmptyEntries)
    $firstName = $nameParts[0]
    $lastName = if ($nameParts.Count -gt 1) { $nameParts[1] } else { "" }

    $representation = @{
        username = $User.Email
        email = $User.Email
        firstName = $firstName
        lastName = $lastName
        emailVerified = $true
        enabled = $true
    }

    if ($null -eq $existingUser) {
        $representation.credentials = @(@{
            type = "password"
            value = $Password
            temporary = $false
        })
        Invoke-Json -Method Post -Uri $usersUrl -Headers $headers -Body $representation | Out-Null
        $existingUser = Find-KeycloakUser -Token $Token -Email $User.Email
        if ($null -eq $existingUser -or -not $existingUser.id) {
            throw "Keycloak user was created but could not be found again: $($User.Email)"
        }
    } else {
        $userId = $existingUser.id
        Invoke-Json -Method Put -Uri (Join-Url $KeycloakUrl "/admin/realms/$Realm/users/$userId") -Headers $headers -Body $representation | Out-Null
        Invoke-Json -Method Put -Uri (Join-Url $KeycloakUrl "/admin/realms/$Realm/users/$userId/reset-password") -Headers $headers -Body @{
            type = "password"
            value = $Password
            temporary = $false
        } | Out-Null
    }

    $keycloakId = $existingUser.id
    Set-UserRole -Token $Token -UserId $keycloakId -Role $User.Role
    return $keycloakId
}

function Set-UserRole([string]$Token, [string]$UserId, [string]$Role) {
    $headers = @{ Authorization = "Bearer $Token" }
    $assignedUrl = Join-Url $KeycloakUrl "/admin/realms/$Realm/users/$UserId/role-mappings/realm"
    $assigned = Invoke-Json -Method Get -Uri $assignedUrl -Headers $headers
    $technicalRoles = @("ADMIN", "MANAGER", "EMPLOYEE")
    $toRemove = @($assigned | Where-Object { $technicalRoles -contains $_.name -and $_.name -ne $Role })
    if ($toRemove.Count -gt 0) {
        $removeJson = "[" + (($toRemove | ForEach-Object { $_ | ConvertTo-Json -Depth 20 }) -join ",") + "]"
        Invoke-Json -Method Delete -Uri $assignedUrl -Headers $headers -Body $removeJson | Out-Null
    }

    $assignedNames = @($assigned | ForEach-Object { $_.name })
    if ($assignedNames -notcontains $Role) {
        $roleRepresentation = Get-RealmRole -Token $Token -Role $Role
        $roleJson = "[" + ($roleRepresentation | ConvertTo-Json -Depth 20) + "]"
        Invoke-Json -Method Post -Uri $assignedUrl -Headers $headers -Body $roleJson | Out-Null
    }
}

function Try-SyncAuthProfiles([string]$PiloteToken, [array]$SeededUsers) {
    $headers = @{ Authorization = "Bearer $PiloteToken" }
    $targets = @(
        (Join-Url $AuthServiceUrl "/api/auth/users/sync"),
        (Join-Url $GatewayUrl "/api/auth/users/sync")
    )

    $synced = 0
    foreach ($seeded in $SeededUsers) {
        foreach ($target in $targets) {
            try {
                $body = @{
                    keycloakId = $seeded.KeycloakId
                    fullName = $seeded.FullName
                    email = $seeded.Email
                    role = $seeded.Role
                } | ConvertTo-Json -Depth 10
                $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $target -Headers $headers -ContentType "application/json" -Body $body
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                    $synced++
                    break
                }
            } catch {
            }
        }
    }

    return $synced -eq $SeededUsers.Count
}

function Try-SeedEmployeeProfiles([string]$PiloteToken, [array]$SeededUsers) {
    Try-RelaxLocalEmployeeSchema | Out-Null

    $headers = @{ Authorization = "Bearer $PiloteToken" }
    $targets = @(
        (Join-Url $EmployeeServiceUrl "/api/employees"),
        (Join-Url $GatewayUrl "/api/employees")
    )

    foreach ($target in $targets) {
        try {
            $current = Invoke-Json -Method Get -Uri $target -Headers $headers
            $superviseur = $SeededUsers | Where-Object { $_.Role -eq "MANAGER" } | Select-Object -First 1
            foreach ($seeded in $SeededUsers) {
                $existing = @($current | Where-Object { $_.email -eq $seeded.Email -or $_.userKeycloakId -eq $seeded.KeycloakId } | Select-Object -First 1)
                $seedBannette = "FO"
                if ($seeded.Role -eq "ADMIN") {
                    $seedBannette = "Pilotage"
                }
                $seedManagerKeycloakId = $null
                if ($seeded.Role -eq "EMPLOYEE") {
                    $seedManagerKeycloakId = $superviseur.KeycloakId
                }
                $payload = @{
                    userKeycloakId = $seeded.KeycloakId
                    fullName = $seeded.FullName
                    email = $seeded.Email
                    department = "DS Magasin"
                    bannette = $seedBannette
                    operationalStatus = $null
                    activityStatus = $null
                    managerKeycloakId = $seedManagerKeycloakId
                    address = $null
                    latitude = $null
                    longitude = $null
                    status = "ACTIVE"
                }
                if ($existing.Count -gt 0) {
                    Invoke-Json -Method Put -Uri (Join-Url $target "/$($existing[0].id)") -Headers $headers -Body $payload | Out-Null
                } else {
                    Invoke-Json -Method Post -Uri $target -Headers $headers -Body $payload | Out-Null
                }
            }
            return $true
        } catch {
        }
    }

    return $false
}

function Wait-LocalEndpoint([string]$Url, [int]$TimeoutSeconds = 60) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    return $false
}

function Wait-AuthenticatedEndpoint([string]$Url, [string]$Token, [int]$TimeoutSeconds = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $headers = @{ Authorization = "Bearer $Token" }
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers $headers -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
            if ($_.Exception.Response) {
                $status = [int]$_.Exception.Response.StatusCode
                if ($status -eq 403) {
                    return $true
                }
            }
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    return $false
}

function Try-RelaxLocalEmployeeSchema {
    try {
        $sql = "ALTER TABLE employees ALTER COLUMN job_title DROP NOT NULL; ALTER TABLE employees ALTER COLUMN status DROP NOT NULL; ALTER TABLE employees ALTER COLUMN user_keycloak_id DROP NOT NULL; ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;"
        docker exec cgi-flow-auth-postgres psql -U postgres -d cgi_flow_employee -c $sql | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-Endpoint([string]$Token, [string]$Path) {
    $headers = @{ Authorization = "Bearer $Token" }
    $targets = @()
    $targets += (Join-Url $GatewayUrl $Path)
    if ($Path.StartsWith("/api/auth")) {
        $targets += (Join-Url $AuthServiceUrl $Path)
    } else {
        $targets += (Join-Url $EmployeeServiceUrl $Path)
    }

    foreach ($target in $targets) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $target -Headers $headers
            $status = [int]$response.StatusCode
            if ($status -ne 404) {
                return $status
            }
        } catch {
            if ($_.Exception.Response) {
                $status = [int]$_.Exception.Response.StatusCode
                if ($status -ne 404) {
                    return $status
                }
            }
        }
    }
    return 404
}

$adminToken = Get-UsableAdminToken
Ensure-Realm -Token $adminToken
$adminToken = Get-UsableAdminToken
Ensure-Client -Token $adminToken
foreach ($role in @("ADMIN", "MANAGER", "EMPLOYEE")) {
    Ensure-RealmRole -Token $adminToken -Role $role
}

$seededUsers = @()
$credentialLines = @(
    "CGI-FLOW local development credentials",
    "Generated: $((Get-Date).ToString("s"))",
    "Keycloak: $KeycloakUrl",
    "Realm: $Realm",
    "",
    "Do not commit this file.",
    ""
)

foreach ($user in $Users) {
    $password = New-LocalPassword
    $keycloakId = Ensure-User -Token $adminToken -User $user -Password $password
    $seededUsers += [pscustomobject]@{
        Email = $user.Email
        FullName = $user.FullName
        Role = $user.Role
        KeycloakId = $keycloakId
        Password = $password
    }
    $credentialLines += "Email: $($user.Email)"
    $credentialLines += "Role: $($user.Role)"
    $credentialLines += "Password: $password"
    $credentialLines += ""
}

$credentialsFullPath = Join-Path (Get-Location) $CredentialsPath
$credentialsDirectory = Split-Path -Parent $credentialsFullPath
New-Item -ItemType Directory -Path $credentialsDirectory -Force | Out-Null
Set-Content -Path $credentialsFullPath -Value $credentialLines -Encoding UTF8

$pilote = $seededUsers | Where-Object { $_.Role -eq "ADMIN" } | Select-Object -First 1
$piloteToken = Get-UserToken -Username $pilote.Email -Password $pilote.Password
Wait-LocalEndpoint -Url (Join-Url $AuthServiceUrl "/api/auth/health") | Out-Null
Wait-LocalEndpoint -Url (Join-Url $EmployeeServiceUrl "/api/employees/health") | Out-Null
Wait-AuthenticatedEndpoint -Url (Join-Url $AuthServiceUrl "/api/auth/me") -Token $piloteToken | Out-Null
Wait-AuthenticatedEndpoint -Url (Join-Url $EmployeeServiceUrl "/api/employees") -Token $piloteToken | Out-Null
$authProfilesSynced = Try-SyncAuthProfiles -PiloteToken $piloteToken -SeededUsers $seededUsers
$employeeProfilesSeeded = Try-SeedEmployeeProfiles -PiloteToken $piloteToken -SeededUsers $seededUsers

$verification = @()
foreach ($seeded in $seededUsers) {
    $token = Get-UserToken -Username $seeded.Email -Password $seeded.Password
    $usersStatus = Test-Endpoint -Token $token -Path "/api/auth/users"
    $employeesStatus = Test-Endpoint -Token $token -Path "/api/employees"
    $myProfileStatus = Test-Endpoint -Token $token -Path "/api/employees/me"
    $verification += [pscustomobject]@{
        Email = $seeded.Email
        Role = $seeded.Role
        Token = if ($token) { "OK" } else { "FAILED" }
        Users = $usersStatus
        Employees = $employeesStatus
        MyProfile = $myProfileStatus
    }
}

Write-Host "Seeded local Keycloak dev users."
Write-Host "Credentials written to: $credentialsFullPath"
Write-Host "Auth profile sync attempted: $(if ($authProfilesSynced) { "OK" } else { "CHECK VERIFICATION" })"
Write-Host "Employee profile seed attempted: $(if ($employeeProfilesSeeded) { "OK" } else { "CHECK VERIFICATION" })"
Write-Host ""
Write-Host "Verification status codes:"
$verification | Format-Table -AutoSize
