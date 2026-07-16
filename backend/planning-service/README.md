# Planning Service

## Purpose

Manages schedules, shifts, availability, assignments, and resource planning.

## Implemented Features

- Deterministic weekly generation for exactly 12 active agents.
- Exact Monday-Saturday coverage for the seven standard shifts.
- Sunday coverage with three 05:00 shifts and fixed + rotating SCO assignments.
- 40-hour weeks, two OFF days, five-day consecutive limit, and ten-hour rest validation.
- Rolling eight-week shift, weekend, opening, closing, and SCO fairness tracking.
- Locked/manual supervisor assignments with validation before save or publish.
- Structured validation conflicts and ADMIN/MANAGER write permissions.
- Employee requests for telework, leave, and shift swaps.
- Supervisor request decisions with `APPROVED`, `REJECTED`, and `CANCELLED` statuses.
- Approved leave blocks generation and validation as `CONGE`.
- Approved telework is exposed on weekly planning responses as `TELETRAVAIL`.
- Approved shift swaps update saved planning assignments when both target cells are valid and unlocked.
- Planning-agent roster sync by email through a manager endpoint.
- Notification hooks for planning publication and request decisions.

## Current Entities

- PlanningWeek
- Shift
- PlanningAgent
- PlanningAssignment
- AgentUnavailability
- PlanningAssignmentFreeze
- PlanningOffDayLock
- PlanningOverrideAudit
- TeleworkRequest
- LeaveRequest
- ShiftSwapRequest

## Main Endpoints

- `GET /api/plannings/agents`
- `POST /api/plannings/agents/sync`
- `GET /api/plannings/agents/swap-options`
- `GET /api/plannings/viewer`
- `GET /api/plannings/week/{weekStartDate}`
- `POST /api/plannings/weeks/generate`
- `POST /api/plannings/weeks`
- `POST /api/plannings/validate`
- `POST /api/plannings/{id}/publish`
- `POST /api/plannings/agents/fixed-sco`
- `PATCH /api/plannings/week/{weekStartDate}/lock`
- `PATCH /api/plannings/week/{weekStartDate}/unavailability`
- `GET /api/plannings/week/{weekStartDate}/telework-requests`
- `POST /api/plannings/telework-requests`
- `PATCH /api/plannings/telework-requests/{id}/status`
- `GET /api/plannings/week/{weekStartDate}/leave-requests`
- `POST /api/plannings/leave-requests`
- `PATCH /api/plannings/leave-requests/{id}/status`
- `GET /api/plannings/swap-requests`
- `POST /api/plannings/swap-requests`
- `PATCH /api/plannings/swap-requests/{id}/status`
- `GET /api/plannings/weekend-off-statistics`

## Known Gaps

- Employee Service currently has no employee roster API, so planning-agent sync is exposed as a planning endpoint and can be connected once Employee Service is implemented.
- Notification Service currently has no delivery API, so planning emits notification hooks through `PlanningNotificationService` with a logging implementation.

## Dependencies

- PostgreSQL for planning data.
- Employee Service for future staff and team synchronization.
- Notification Service for future schedule and request delivery.
