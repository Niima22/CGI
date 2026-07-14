# CGI-INTRANET

Professional intranet architecture skeleton for CGI internal workflows.

## Structure

- `FRONTCODED/` - React + Vite frontend used by local launch.
- `frontend/` - Previous integrated React + Vite frontend.
- `backend/` - Spring Boot microservice skeletons.
- `ai_service/` - Existing FastAPI AI service. Keep this service working and isolated.
- `ai-engine/` - Future ML and training experiments.
- `docs/` - Architecture and project documentation.

## Local Development

PostgreSQL is exposed on `localhost:55432` to avoid conflicts with a machine-level PostgreSQL
running on `5432`.

There is one local PostgreSQL container and two application databases inside it:

- auth database: `cgi_flow_auth`
- employee database: `cgi_flow_employee`

Both use:

- host: `localhost`
- port: `55432`
- username: `postgres`
- password: value from `.env` -> `POSTGRES_PASSWORD` / `SPRING_DATASOURCE_PASSWORD`

Before launching, create a repo-root `.env` file from `.env.example` and set your local secrets.
If your PostgreSQL password is not the default `postgres`, put the real value in both
`POSTGRES_PASSWORD` and `SPRING_DATASOURCE_PASSWORD`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-backend.ps1
powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1
powershell -ExecutionPolicy Bypass -File scripts\health-dev.ps1
```

## Launch Order

The local stack starts in this order:

1. Docker dependencies: PostgreSQL and Keycloak
2. `discovery-service`
3. `auth-user-service`
4. `employee-service`
5. `ticket-service`
6. `sla-service`
7. `api-gateway`
8. `ai_service`
9. `frontend`

To launch manually instead of using the scripts:

```powershell
docker compose up -d
```

Then start these Spring Boot services from IntelliJ or with `java -jar`:

- `backend/discovery-service` on `8761`
- `backend/auth-user-service` on `8081`
- `backend/employee-service` on `8082`
- `backend/ticket-service` on `8083`
- `backend/sla-service` on `8084`
- `backend/api-gateway` on `8080`

IntelliJ datasource settings:

- Auth DB
  - host: `localhost`
  - port: `55432`
  - database: `cgi_flow_auth`
  - username: `postgres`
  - password: your local `.env` password

- Employee DB
  - host: `localhost`
  - port: `55432`
  - database: `cgi_flow_employee`
  - username: `postgres`
  - password: your local `.env` password

Then start:

```powershell
cd ai_service
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001

cd ..\FRONTCODED
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Main URLs:

- Frontend: `http://127.0.0.1:5173/`
- Keycloak: `http://127.0.0.1:8085/`
- Eureka: `http://127.0.0.1:8761/`
- AI health: `http://127.0.0.1:8001/health`

Seed local Keycloak role accounts:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\seed-keycloak-dev-users.ps1
```

The script creates or resets local-only `ADMIN`, `MANAGER`, and `EMPLOYEE` users, syncs local
profiles when the backend is running, and writes generated credentials to
`.run/dev-credentials.txt`. The `.run/` directory is ignored by Git.

Before a demo, use this sequence to avoid stale JARs:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-backend.ps1
powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1
powershell -ExecutionPolicy Bypass -File scripts\health-dev.ps1
```

`start-dev.ps1` now stops stale listeners on the managed ports before relaunching the local stack,
and `health-dev.ps1` checks not only liveness but also the current auth and employee protected
endpoints expected by this module.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the planned architecture.
For local SLA/KPI demo preparation and walkthrough, see [docs/DEMO_SLA_KPI.md](docs/DEMO_SLA_KPI.md) and [docs/PFE_DEMO_CHECKLIST.md](docs/PFE_DEMO_CHECKLIST.md).
Intranet system
