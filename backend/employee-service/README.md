# Employee Service

## Purpose

Manages employee records, organizational structure, departments, teams, and employee profile metadata.

## Planned Features

- Employee profile management.
- Department and team assignment.
- Manager hierarchy lookup.
- Employee search and filtering.
- Employee status tracking.

## Planned Entities

- Employee
- Department
- Team
- JobTitle
- EmploymentStatus

## Planned Endpoints

- `GET /employees`
- `GET /employees/{id}`
- `POST /employees`
- `PATCH /employees/{id}`
- `GET /departments`
- `GET /teams`

## Dependencies

- PostgreSQL for employee data.
- Auth User Service for account linkage.
- Planning Service for schedule assignments.
