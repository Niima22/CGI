# CGI-INTRANET Architecture

## Global Architecture

CGI-INTRANET is planned as a modular intranet platform with a React frontend, Spring Boot backend microservices, PostgreSQL persistence, and an existing FastAPI AI service for resolution generation and quality assistance.

The current repository is an architecture skeleton. Business logic, database schemas, production Docker setup, and CI/CD pipelines will be added later.

## Frontend

The frontend uses React with Vite and lives in `frontend/`.

Planned responsibilities:

- Render intranet user workflows.
- Authenticate users through backend APIs.
- Call backend services using REST.
- Display tickets, dashboards, notifications, planning, transport, and AI-assisted resolution results.

The frontend should not call PostgreSQL directly. It should also avoid calling the FastAPI AI service directly unless a future architecture decision explicitly allows it.

## Backend

The backend is planned as Spring Boot microservices under `backend/`.

Planned services:

- `auth-user-service` - authentication, users, roles, profiles.
- `employee-service` - employee records and organization data.
- `ticket-service` - support ticket lifecycle.
- `sla-service` - SLA policies, deadlines, and escalation rules.
- `knowledge-service` - knowledge articles and resolution references.
- `dashboard-service` - analytics and reporting aggregation.
- `notification-service` - email, in-app, and alert notifications.
- `messaging-service` - internal messages and conversations.
- `planning-service` - schedules, shifts, and resource planning.
- `transport-service` - transport requests and tracking.
- `api-gateway` - public backend entry point, routing, and cross-cutting controls.

Each microservice has only an architecture skeleton for now:

- `controller/`
- `service/impl/`
- `repository/`
- `entity/`
- `dto/request/`
- `dto/response/`
- `mapper/`
- `validation/`
- `exception/`
- `config/`
- `security/`
- `client/`
- `enums/`
- `util/`

## Database

PostgreSQL is the planned primary relational database.

Expected approach:

- Each Spring Boot service owns its own schema or clearly bounded data model.
- Services communicate through APIs rather than sharing repositories.
- Database migrations should be introduced later with Flyway or Liquibase.

## FastAPI AI Service

The existing `ai_service/` is a working FastAPI service and must remain isolated from backend skeleton work.

The current AI endpoint `/generate-resolution-frame` must not be modified as part of architecture setup.

When AI is needed, backend services will call the FastAPI service over REST. The FastAPI service returns AI-generated ticket assistance fields such as:

- `resolutionFrame`
- `resolutionType`
- `qualityScore`
- `confidenceScore`
- `similarCases`

## REST Communication

Primary communication style is REST:

- React frontend calls Spring Boot backend endpoints.
- Spring Boot services call each other through REST clients where needed.
- Spring Boot backend calls FastAPI AI service when AI output is required.

The API Gateway will eventually centralize external routing from the frontend to backend services.

## Security

JWT security is planned for authentication and authorization.

Expected approach:

- `auth-user-service` issues and validates tokens.
- `api-gateway` enforces token presence and routes authenticated requests.
- Individual services validate authorization boundaries for their own resources.
- Service-to-service communication may later use internal tokens or mTLS.

## Request Flow

Standard application request:

```text
User -> React frontend -> Spring Boot backend -> PostgreSQL
```

AI-assisted request:

```text
User -> React frontend -> Spring Boot backend -> FastAPI AI service
FastAPI AI service -> Spring Boot backend -> React frontend
```

When AI generation is needed:

```text
Backend -> FastAPI AI service
FastAPI -> returns resolutionFrame, resolutionType, qualityScore, confidenceScore, similarCases
```

## Docker And CI/CD

`docker-compose.yml` is currently a placeholder only.

Planned future work:

- Add local PostgreSQL container.
- Add service containers for each Spring Boot microservice.
- Add frontend container or static hosting pipeline.
- Add FastAPI AI service container wiring.
- Add CI checks for frontend lint/build and backend tests.
- Add deployment pipelines after service contracts stabilize.
