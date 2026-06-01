# Auth User Service

## Purpose

Handles authentication, user identity, roles, sessions, and profile access for CGI-INTRANET.

## Planned Features

- User registration and account administration.
- Login and JWT token issuing.
- Role and permission management.
- Password reset and account status management.
- Current-user profile endpoint.

## Planned Entities

- User
- Role
- Permission
- UserSession
- PasswordResetToken

## Planned Endpoints

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /users/me`
- `GET /users`
- `POST /users`
- `PATCH /users/{id}`

## Dependencies

- PostgreSQL for identity data.
- API Gateway for external routing.
- Notification Service for account and password notifications.
