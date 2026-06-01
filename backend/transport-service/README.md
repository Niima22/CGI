# Transport Service

## Purpose

Manages transport requests, routes, reservations, approvals, and transport status tracking.

## Planned Features

- Transport request creation.
- Approval workflow.
- Vehicle or route assignment.
- Request status tracking.
- Transport usage reporting.

## Planned Entities

- TransportRequest
- Vehicle
- Route
- TransportApproval
- TransportSchedule

## Planned Endpoints

- `GET /transport/requests`
- `GET /transport/requests/{id}`
- `POST /transport/requests`
- `PATCH /transport/requests/{id}`
- `POST /transport/requests/{id}/approve`
- `GET /transport/routes`

## Dependencies

- PostgreSQL for transport records.
- Employee Service for requester data.
- Notification Service for approval and status updates.
