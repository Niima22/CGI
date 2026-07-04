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

## Planned Entities

- Schedule
- Shift
- Availability
- PlanningAssignment
- PlanningException

## Main Endpoints

- `GET /api/plannings/week/{weekStartDate}`
- `POST /api/plannings/weeks/generate`
- `POST /api/plannings/weeks`
- `POST /api/plannings/validate`
- `POST /api/plannings/{id}/publish`
- `POST /api/plannings/agents/fixed-sco`

## Dependencies

- PostgreSQL for planning data.
- Employee Service for staff and team data.
- Notification Service for schedule updates.
