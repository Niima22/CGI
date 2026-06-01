# Messaging Service

## Purpose

Supports internal messaging, conversations, and collaboration around intranet workflows.

## Planned Features

- Direct messages.
- Team conversations.
- Message read status.
- Ticket-linked discussions.
- Attachment metadata tracking.

## Planned Entities

- Conversation
- Message
- MessageParticipant
- MessageReadReceipt
- MessageAttachment

## Planned Endpoints

- `GET /conversations`
- `POST /conversations`
- `GET /conversations/{id}/messages`
- `POST /conversations/{id}/messages`
- `PATCH /messages/{id}/read`

## Dependencies

- PostgreSQL for messages and conversations.
- Auth User Service for users.
- Employee Service for team membership.
- Ticket Service for ticket-linked conversations.
