# User and Employee Workflow

## Terminology

Technical roles stay unchanged for Keycloak and backend authorization:

- `ADMIN`
- `MANAGER`
- `EMPLOYEE`

Business labels used in the UI and workflow:

- `ADMIN` -> Pilote
- `MANAGER` -> Superviseur
- `EMPLOYEE` -> Agent

## Existing Behavior

- `auth-user-service` manages Keycloak-backed accounts, local user profiles, technical roles,
  enabled/disabled status, and `keycloakId`.
- `employee-service` manages employee profile data and links profiles to auth users through
  `userKeycloakId`.
- The frontend authenticates through Keycloak and calls backend APIs through the API Gateway.

## Missing Behavior Before This Update

- Employee profiles did not have `bannette`, `operationalStatus`, or `activityStatus`.
- Employee profile creation required auth-linked fields that should be nullable during Excel import.
- Superviseur-scoped employee access and bannette assignment rules were not represented.
- Employee import preview/confirmation endpoints were not present.
- UI exposed technical role labels instead of business labels.

## Implemented Direction

- Pilote can globally manage auth users and employee profiles.
- Superviseur can view scoped employees and update bannette only inside assigned scope.
- Agent can access own employee profile through `/api/employees/me`.
- Employee import uses Excel only for profile data: `fullName`, `department`, `bannette`, and optional
  operational/activity status when clearly available.
- KPI/performance values, totals, percentages, ticket metrics, QS, NPS, and calculations are not
  imported.

## Backend Endpoints

- `PATCH /api/employees/{id}/bannette`
- `PATCH /api/employees/{id}/link-user`
- `PATCH /api/employees/{id}/manager`
- `POST /api/employees/import/preview`
- `POST /api/employees/import/confirm`

All frontend calls must continue through the API Gateway.
