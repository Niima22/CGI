# Dashboard Service

## Purpose

Provides aggregated metrics, reporting views, and dashboard data for operational monitoring.

## Planned Features

- Ticket volume metrics.
- SLA compliance reports.
- Consultant and team productivity views.
- AI quality score summaries.
- Export-ready reporting data.

## Planned Entities

- DashboardWidget
- ReportDefinition
- MetricSnapshot
- DashboardPreference

## Planned Endpoints

- `GET /dashboard/summary`
- `GET /dashboard/tickets`
- `GET /dashboard/sla`
- `GET /dashboard/ai-quality`
- `GET /reports/export`

## Dependencies

- Ticket Service for ticket metrics.
- SLA Service for compliance metrics.
- Employee Service for organization filters.
- PostgreSQL for dashboard configuration.
