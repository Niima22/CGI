# Ticket Service

## Purpose

Manages support ticket lifecycle, assignment, status changes, comments, and resolution records.

## Planned Features

- Ticket creation and update.
- Ticket assignment to consultants or teams.
- Status workflow management.
- Resolution history tracking.
- AI-assisted resolution request orchestration.

## Planned Entities

- Ticket
- TicketComment
- TicketAssignment
- TicketStatusHistory
- TicketResolution

## Planned Endpoints

- `GET /tickets`
- `GET /tickets/{id}`
- `POST /tickets`
- `PATCH /tickets/{id}`
- `POST /tickets/{id}/comments`
- `POST /tickets/{id}/generate-resolution`

## Dependencies

- PostgreSQL for ticket data.
- Employee Service for assignee details.
- SLA Service for deadline calculations.
- Knowledge Service for references.
- FastAPI AI Service for AI resolution assistance.
