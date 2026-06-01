# Notification Service

## Purpose

Manages in-app notifications, email notifications, alert delivery, and notification preferences.

## Planned Features

- Send user notifications.
- Manage notification templates.
- Track notification delivery status.
- Store user notification preferences.
- Emit alerts for SLA escalations and account events.

## Planned Entities

- Notification
- NotificationTemplate
- NotificationPreference
- DeliveryAttempt

## Planned Endpoints

- `GET /notifications`
- `POST /notifications`
- `PATCH /notifications/{id}/read`
- `GET /notifications/preferences`
- `PATCH /notifications/preferences`

## Dependencies

- PostgreSQL for notification records.
- Auth User Service for recipient identity.
- SLA Service for escalation alerts.
- Ticket Service for ticket event alerts.
