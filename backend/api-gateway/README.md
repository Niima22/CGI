# API Gateway

## Purpose

Acts as the main backend entry point for the React frontend and routes requests to Spring Boot microservices.

## Planned Features

- Route frontend requests to backend services.
- Validate JWT tokens.
- Apply cross-origin and request policies.
- Centralize API version routing.
- Prepare for rate limiting and tracing.

## Planned Entities

- No persistent business entities are planned for the gateway.
- Gateway route configuration may be externalized later.

## Planned Endpoints

- `GET /actuator/health`
- Gateway routes for `/auth/**`
- Gateway routes for `/employees/**`
- Gateway routes for `/tickets/**`
- Gateway routes for `/dashboard/**`

## Dependencies

- Auth User Service for JWT validation strategy.
- All backend microservices for request routing.
- React frontend as the primary external client.
