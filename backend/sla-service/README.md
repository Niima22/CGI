# SLA Service

## Purpose

Manages service-level agreements, deadlines, breach detection, priority rules, and escalation planning.

## Planned Features

- SLA policy management.
- Ticket deadline calculation.
- SLA breach detection.
- Escalation rule evaluation.
- SLA reporting data.

## Planned Entities

- SlaPolicy
- SlaRule
- SlaTimer
- EscalationRule
- SlaBreach

## Planned Endpoints

- `GET /sla/policies`
- `POST /sla/policies`
- `PATCH /sla/policies/{id}`
- `POST /sla/calculate`
- `GET /sla/breaches`

## Dependencies

- PostgreSQL for SLA rules.
- Ticket Service for ticket context.
- Notification Service for escalation alerts.
- Dashboard Service for reporting.
