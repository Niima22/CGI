# Planning Service

## Purpose

Manages schedules, shifts, availability, assignments, and resource planning.

## Planned Features

- Shift planning.
- Employee availability tracking.
- Assignment calendar.
- Planning conflict detection.
- Team capacity views.

## Planned Entities

- Schedule
- Shift
- Availability
- PlanningAssignment
- PlanningException

## Planned Endpoints

- `GET /planning/schedules`
- `POST /planning/schedules`
- `GET /planning/shifts`
- `POST /planning/shifts`
- `GET /planning/availability`
- `PATCH /planning/assignments/{id}`

## Dependencies

- PostgreSQL for planning data.
- Employee Service for staff and team data.
- Notification Service for schedule updates.
