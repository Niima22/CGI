# Auth/User Module

## Module Objective

The Auth/User module provides centralized authentication and role-based user
management for CGI-FLOW.

It is responsible for:

- authenticating users through Keycloak;
- validating Keycloak JWT access tokens in `auth-user-service`;
- exposing the authenticated user's identity and local profile;
- enforcing `ADMIN`, `MANAGER`, and `EMPLOYEE` permissions;
- allowing an administrator to create a Keycloak account, assign its realm
  role, and synchronize its PostgreSQL application profile.

## User Creation Rule

CGI-FLOW has no public registration or self-service signup.

- Only a user with the `ADMIN` realm role can create and manage users.
- `MANAGER` and `EMPLOYEE` users cannot call the create-user endpoint.
- The frontend has no signup page, route, button, or registration form.
- Users authenticate only after an administrator has provisioned their account.

## Architecture Flow

```text
React frontend (5173)
        |
        | Login redirect / OIDC Authorization Code + PKCE
        v
Keycloak (8085)
        |
        | JWT access token
        v
React frontend (token kept in memory)
        |
        | Authorization: Bearer <access-token>
        v
API Gateway (8080)
        |
        | Eureka route: lb://auth-user-service
        v
auth-user-service (8081)
        |
        +---- validates JWT issuer and realm roles
        |
        +---- PostgreSQL cgi_flow_auth (5432)
        |
        +---- Keycloak Admin API for ADMIN user creation
```

User provisioning flow:

```text
Admin logs in
  -> opens User Management
  -> submits the create-user form
  -> backend creates or reuses the Keycloak user
  -> backend assigns the selected realm role
  -> backend creates or updates the PostgreSQL UserProfile
  -> the new user can log in with the provisioned account
```

Eureka provides service discovery for the gateway and
`auth-user-service`. The frontend uses relative `/api/...` URLs, and the Vite
development proxy forwards them to the gateway.

## Runtime Ports

| Component | Port | Local URL |
|---|---:|---|
| React/Vite frontend | 5173 | `http://localhost:5173` |
| API Gateway | 8080 | `http://localhost:8080` |
| auth-user-service | 8081 | `http://localhost:8081` |
| Keycloak | 8085 | `http://localhost:8085` |
| Eureka discovery-service | 8761 | `http://localhost:8761` |
| PostgreSQL | 5432 | `jdbc:postgresql://localhost:5432/cgi_flow_auth` |

## Keycloak Configuration

Current local configuration:

| Setting | Value |
|---|---|
| Server URL | `http://localhost:8085` |
| Realm | `cgi-flow` |
| Frontend client | `cgi-flow-web` |
| Client authentication | Off (public browser client) |
| Standard flow | On |
| Direct access grants | On for local token testing |
| Valid frontend redirect | `http://localhost:5173/*` |
| JWT issuer | `http://localhost:8085/realms/cgi-flow` |
| Realm roles | `ADMIN`, `MANAGER`, `EMPLOYEE` |

Realm roles are stored in the JWT claim:

```text
realm_access.roles
```

The backend converts each role to a Spring Security authority with the
`ROLE_` prefix. For example, `ADMIN` becomes `ROLE_ADMIN`.

The Keycloak Admin API configuration is provided to `auth-user-service`
through these environment variables:

```text
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8085
KEYCLOAK_REALM=cgi-flow
KEYCLOAK_ADMIN_REALM=master
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_USERNAME=<local-admin-username>
KEYCLOAK_ADMIN_PASSWORD=<local-admin-password>
```

Real deployment credentials must come from a secret manager or protected
environment configuration. They must not be committed to source control.

## Roles and Permissions

| Capability | ADMIN | MANAGER | EMPLOYEE | Anonymous |
|---|:---:|:---:|:---:|:---:|
| Health check | Yes | Yes | Yes | Yes |
| Read own authenticated identity | Yes | Yes | Yes | No |
| List/read user profiles | Yes | Yes | No | No |
| Open frontend `/users` page | Yes | No | No | No |
| Create a user | Yes | No | No | No |
| Update local profile role | Yes | No | No | No |
| Update local profile status | Yes | No | No | No |

All other `auth-user-service` endpoints require authentication unless a more
specific rule denies access.

## Backend Endpoints

All normal frontend requests go through the gateway at
`http://localhost:8080`. Direct service URLs on port `8081` are useful for
local diagnosis.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/auth/health` | Public | Service health check |
| `GET` | `/api/auth/me` | Authenticated | JWT identity, realm roles, and matching local profile |
| `GET` | `/api/auth/users` | ADMIN, MANAGER | List local user profiles |
| `GET` | `/api/auth/users/{id}` | ADMIN, MANAGER | Read one local user profile |
| `POST` | `/api/auth/users` | ADMIN | Create/reuse Keycloak user, assign role, sync profile |
| `POST` | `/api/auth/users/sync` | ADMIN | Legacy/dev local profile synchronization |
| `PATCH` | `/api/auth/users/{id}/role` | ADMIN | Update the local profile role |
| `PATCH` | `/api/auth/users/{id}/status` | ADMIN | Update the local profile active flag |
| `GET` | `/api/auth/me/dev/{keycloakId}` | Authenticated, dev-only | Temporary profile lookup endpoint |

### Create User Contract

`POST /api/auth/users`

```json
{
  "fullName": "New User",
  "email": "new.user@test.com",
  "role": "EMPLOYEE",
  "temporaryPassword": "<LOCAL_TEST_PASSWORD>",
  "active": true
}
```

Validation rules:

- `fullName` is required;
- `email` must be a valid email address;
- `role` must be `ADMIN`, `MANAGER`, or `EMPLOYEE`;
- `temporaryPassword` must contain at least 8 characters;
- `active` controls the initial Keycloak enabled state and local profile state.

The successful response is HTTP `201 Created` with the synchronized local
`UserProfile`.

If the email already exists in Keycloak, the backend reuses that Keycloak user,
updates its basic attributes, ensures the selected realm role is assigned, and
synchronizes the local profile instead of creating a duplicate.

## Frontend Pages and Components

Main implementation files:

| File | Responsibility |
|---|---|
| `frontend/src/lib/auth-store.tsx` | Keycloak initialization, in-memory token use, token refresh, `/me`, login/logout, authenticated requests |
| `frontend/src/routes/index.tsx` | Login screen and Keycloak login action |
| `frontend/src/components/app/AuthenticatedView.tsx` | Redirects unauthenticated users away from protected views |
| `frontend/src/components/app/Sidebar.tsx` | Role-aware navigation and logout |
| `frontend/src/components/app/Topbar.tsx` | Displays name, email, and application roles |
| `frontend/src/routes/users.tsx` | ADMIN-only user table, creation form, role update, and status update |
| `frontend/vite.config.ts` | Proxies `/api` requests to the gateway on port 8080 |

The frontend uses `keycloak-js` with Authorization Code flow and PKCE (`S256`).
Access tokens are held by the Keycloak JavaScript adapter in memory. They are
not written to `localStorage` or `sessionStorage`, displayed in the UI, or
logged.

Before each authenticated API request, `authenticatedFetch` refreshes the
token when necessary and adds the bearer authorization header. Logout clears
the current user state and Keycloak token before redirecting through the
Keycloak logout endpoint.

## Database Table and Entity

Database: `cgi_flow_auth`

JPA entity: `UserProfile`

Table: `user_profiles`

| Column | Type/behavior |
|---|---|
| `id` | Generated primary key |
| `keycloak_id` | Unique, required Keycloak user ID |
| `full_name` | Required display name |
| `email` | Unique, required email |
| `role` | Enum: `ADMIN`, `MANAGER`, or `EMPLOYEE` |
| `active` | Local active status |
| `created_at` | Set when the profile is created |
| `updated_at` | Updated whenever the profile changes |

Keycloak remains the identity and credential authority. PostgreSQL stores the
application-facing profile and application role/status data used by CGI-FLOW.
`GET /api/auth/me` first searches the local profile by Keycloak subject
(`sub`), then falls back to email.

## JWT Security Flow

1. The user selects **Se connecter avec Keycloak**.
2. The browser is redirected to the `cgi-flow` Keycloak realm.
3. Keycloak authenticates the user and returns an authorization code.
4. `keycloak-js` exchanges the code using PKCE and keeps the access token in
   memory.
5. The frontend calls the gateway with a bearer token.
6. The gateway routes `/api/auth/**` to `auth-user-service` through Eureka.
7. Spring Security validates the token against the configured issuer:
   `http://localhost:8085/realms/cgi-flow`.
8. The custom JWT converter reads `realm_access.roles` and creates Spring
   authorities such as `ROLE_ADMIN`.
9. Endpoint authorization rules allow or reject the request.
10. `/api/auth/me` returns the JWT identity plus the matching PostgreSQL
    profile when one exists.

No raw JWT value should be included in logs, screenshots, documentation, or
support messages.

## How ADMIN Creates a User

1. Log in with an account carrying the Keycloak `ADMIN` realm role.
2. Open **Gestion des utilisateurs** at `/users`.
3. Select **Ajouter un utilisateur**.
4. Enter the full name, email, initial password, role, and active state.
5. Submit the form.
6. The frontend calls `POST /api/auth/users` through the gateway.
7. `auth-user-service` obtains an administrative Keycloak token internally.
8. The service creates or reuses the Keycloak user.
9. The service assigns the selected realm role.
10. The service creates or updates the PostgreSQL `UserProfile`.
11. The frontend refreshes the user table and shows a readable result message.

The initial password is submitted only for provisioning. It is not displayed
after submission and must not be logged.

## Test Accounts

Local development accounts:

| Account | Expected role |
|---|---|
| `admin@test.com` | `ADMIN` |
| `manager@test.com` | `MANAGER` |
| `employee@test.com` | `EMPLOYEE` |

For local demonstrations, a placeholder such as `<LOCAL_TEST_PASSWORD>` may be
replaced with a disposable value, for example `Test1234`. This is only an
example for local development and must never be reused as a production
password.

## How to Run Locally

Prerequisites:

- Docker Desktop with Docker Compose;
- Java 17;
- Maven;
- Node.js and npm;
- existing Keycloak realm/client/roles, or permission to configure them.

### 1. Start PostgreSQL and Keycloak

From the repository root:

```powershell
docker compose up -d auth-postgres keycloak
docker compose ps
docker compose logs --tail=100 keycloak
```

Do not use `docker compose down -v` unless destroying all local authentication
data is explicitly intended.

For an existing PostgreSQL volume, use the password originally stored in that
volume. Supply it to the service without committing it:

```powershell
$env:POSTGRES_PASSWORD="<local-postgres-password>"
```

### 2. Start Eureka

```powershell
cd backend/discovery-service
mvn spring-boot:run
```

Verify `http://localhost:8761`.

### 3. Start auth-user-service

In a new terminal:

```powershell
cd backend/auth-user-service
$env:POSTGRES_PASSWORD="<local-postgres-password>"
$env:KEYCLOAK_ADMIN_USERNAME="<local-admin-username>"
$env:KEYCLOAK_ADMIN_PASSWORD="<local-admin-password>"
mvn spring-boot:run
```

Verify `http://localhost:8081/api/auth/health`.

### 4. Start API Gateway

In a new terminal:

```powershell
cd backend/api-gateway
mvn spring-boot:run
```

Verify `http://localhost:8080/api/auth/health`.

### 5. Start the frontend

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verification and Tests Passed

The final Auth/User stability check verified:

- Keycloak login for ADMIN, MANAGER, and EMPLOYEE;
- role identity returned by `/api/auth/me`;
- logout clears the in-memory Keycloak token;
- protected dashboard access redirects after logout;
- ADMIN sees and can access User Management;
- MANAGER and EMPLOYEE do not see ADMIN navigation;
- MANAGER and EMPLOYEE receive access denied on `/users`;
- gateway authorization returns the expected `200` and `403` responses;
- no fake `localStorage` authentication remains;
- no signup/register route or UI remains;
- no raw token is displayed or logged by the frontend;
- frontend production build passes;
- frontend TypeScript and focused ESLint checks pass;
- `auth-user-service` clean Maven package passes;
- 11 backend tests pass with no failures;
- direct and gateway health checks return HTTP `200`.

## Known Development Notes and Future Improvements

- `POST /api/auth/users/sync` remains for development/backward compatibility
  and should not be the primary production provisioning path.
- `GET /api/auth/me/dev/{keycloakId}` is explicitly dev-only and should be
  removed after all callers use authenticated `/api/auth/me`.
- Current role and status PATCH endpoints update the PostgreSQL profile only.
  A future version should also update Keycloak role mappings and enabled state
  in the same operation to prevent identity/profile drift.
- When an existing Keycloak user is reused during provisioning, the selected
  role is assigned but previously assigned application roles are not removed.
  Production role management should enforce the intended single-role policy
  consistently in Keycloak and PostgreSQL.
- User provisioning currently obtains an admin token with an administrative
  username/password and `admin-cli`. Production should use a dedicated
  confidential service client with minimum required service-account roles.
- Local development enables direct access grants for token testing. Production
  browser login should rely on Authorization Code flow with PKCE, and direct
  grants should be disabled unless a justified integration requires them.
- Local defaults are convenient for development but production credentials,
  database passwords, URLs, and client settings must be externalized.
- Keycloak and PostgreSQL data use Docker volumes. Avoid deleting those volumes
  during routine restarts.
- Provisioning spans Keycloak and PostgreSQL without a distributed transaction.
  Future work can add compensation/retry handling and reconciliation jobs for
  partial failures.
- Add end-to-end tests using a disposable Keycloak test environment for
  repeatable CI verification.

## Explication Courte Pour La Soutenance

Le module Auth/User separe clairement l'identite et les donnees applicatives :
Keycloak gere la connexion, les mots de passe et les roles, tandis que
PostgreSQL conserve le profil utilise par CGI-FLOW. L'utilisateur se connecte
via Keycloak, puis le frontend transmet un JWT au backend a travers l'API
Gateway. `auth-user-service` verifie ce JWT et applique les autorisations selon
les roles `ADMIN`, `MANAGER` et `EMPLOYEE`. Il n'existe aucune inscription
publique : seul un administrateur peut creer un utilisateur depuis la page
`/users`. Cette operation cree le compte Keycloak, lui attribue son role et
synchronise automatiquement son profil dans PostgreSQL.
