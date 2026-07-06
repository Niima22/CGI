# Module 7 - Internal Messaging Validation

## Scope

Module 7 v1 is complete for the implemented internal messaging scope.

Implemented:

- `/messages` frontend route
- direct conversations
- group conversations
- one ticket-linked conversation per ticket
- message history
- unread count and mark-as-read
- urgent message flag
- polling-based refresh
- sidebar unread badge
- ticket-thread authorization through `ticket-service`
- minimal group participant management
- stable paginated message response contract
- frontend unit tests with Vitest

Deferred:

- WebSocket / STOMP / SSE
- attachments
- Kafka
- email
- push

## Frontend route

- Route: `/messages`
- Sidebar entry: `Messagerie`
- Access target: `ADMIN`, `MANAGER`, `EMPLOYEE`

Ticket thread entry point:

- Ticket detail action: `Discussion`
- Navigation target: `/messages?ticketId=<id>&ticketReference=<reference>`

## Authorization rules

### Conversation membership

- only active participants can read a conversation
- only active participants can list messages
- only active participants can send messages
- only active participants can mark a conversation as read

### Ticket-thread authorization

- for `TICKET` conversations, the user must both:
  - be an active messaging participant
  - be authorized to read the ticket in `ticket-service`
- authorization is verified through `ticket-service`, not duplicated inside `messaging-service`
- enforced for:
  - ticket conversation lookup
  - ticket conversation creation
  - conversation detail for `TICKET`
  - message history for `TICKET`
  - message send for `TICKET`

### Group participant management

Endpoints:

- `POST /api/messages/conversations/{id}/participants`
- `DELETE /api/messages/conversations/{id}/participants/{userId}`

Rules:

- only `GROUP` conversations support participant changes
- only conversation creator, `MANAGER`, or `ADMIN` may add or remove participants
- `DIRECT` conversations reject participant changes
- `TICKET` conversations reject participant changes in v1
- removed participants become inactive
- re-adding an inactive participant reactivates the existing record
- the creator cannot remove themselves
- inactive or unknown users cannot be added

## Stable pagination response

Message history now returns a stable contract:

```json
{
  "content": [],
  "page": 0,
  "size": 50,
  "totalElements": 0,
  "totalPages": 0,
  "first": true,
  "last": true
}
```

The frontend API client consumes this DTO directly and no longer depends on raw Spring `PageImpl` JSON fields.

## Read and unread behavior

- opening a conversation triggers `PATCH /api/messages/conversations/{id}/read`
- local unread badges update immediately after mark-read
- sidebar unread total refreshes after read and during polling
- own messages do not count as unread

## Polling behavior

- conversations and unread total: every `45s`
- selected conversation messages: every `30s`
- polling pauses when the page is not visible
- overlapping requests are prevented in the page state layer

## Urgent messages

- composer includes an urgent toggle
- urgent messages are highlighted in the conversation list and history
- raw backend enum values are not shown in the UI

## Frontend test setup

Added:

- `Vitest`
- `React Testing Library`
- `jsdom`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

Files:

- `frontend/vitest.config.ts`
- `frontend/src/test/setup.ts`
- `frontend/src/lib/api/messages.test.ts`
- `frontend/src/test/messages-page.test.tsx`

Covered frontend cases:

- conversation list rendering
- French conversation type labels
- raw enums not displayed
- unread badge rendering
- selecting a conversation loads messages
- opening a conversation calls mark-read
- blank composer cannot be sent
- successful send clears composer
- Enter sends
- direct conversation validation
- group title validation
- ticket conversation creation notice when no thread exists

## Build and automated test results

Validation date:

- `2026-07-04`

Executed successfully:

- `backend/messaging-service`: `clean package`
  - tests run: `44`
  - failures: `0`
  - errors: `0`
  - skipped: `0`
- `backend/ticket-service`: `clean package`
  - tests run: `13`
  - failures: `0`
  - errors: `0`
  - skipped: `0`
- `backend/auth-user-service`: `clean package`
  - tests run: `30`
  - failures: `0`
  - errors: `0`
  - skipped: `0`
- `frontend`: `npm.cmd run test`
  - test files: `2`
  - tests passed: `7`
- `frontend`: `npm.cmd run build`
  - build status: success

## Runtime validation

Services used:

- frontend on `http://localhost:5173`
- api-gateway on `http://127.0.0.1:8080`
- messaging-service on `http://127.0.0.1:8086`
- auth-user-service on `http://127.0.0.1:8081`
- ticket-service on `http://127.0.0.1:8083`
- Keycloak on `http://127.0.0.1:8085`

Users used:

- admin: `pilote@cgi.local`
- manager: `superviseur@cgi.local`
- employee: `agent@cgi.local`

Observed runtime results:

- authorized admin access to ticket thread for ticket `20`: `200`
- unauthorized employee access to the same ticket thread: `403`
- group conversation created successfully
- group participant manager could read and send messages
- non-participant employee access before add: `403`
- participant add by admin: `201`
- newly added participant could read: `200`
- participant removal by admin: `200`
- removed participant access immediately rejected: `403`
- re-adding the same inactive participant reactivated access: `201` then `200`
- pagination contract returned expected fields with `page=0`, `size=1`, `totalPages=2`
- unread count before mark-read: `3`
- unread count after mark-read: `0`
- messaging page still opened correctly in the browser
- no raw enum values such as `DIRECT`, `GROUP`, `TICKET` were visible in the UI
- polling displayed a newly injected message after the backend refresh interval

Artifacts:

- `.run/module7-group-validation.png`
- `.run/module7-ticket-validation-final.png`
- `.run/module7-phase4-polling.png`
- `.run/module7-phase4-validate.ps1`
- `.run/module7-phase4-unread.ps1`

## Known limitations

- realtime remains polling-based only
- participant management is limited to add/remove on groups
- ticket conversations still rely on one-thread-per-ticket
- frontend test suite still emits non-blocking React `act(...)` warnings on one keyboard-send scenario
- Vite build reports a large chunk warning for the main client bundle

## Final status

Module 7 v1 can be marked complete.

Completion basis:

- ticket-thread authorization is enforced against `ticket-service`
- participant management rules are implemented
- stable pagination contract is in place
- backend builds pass
- frontend tests pass
- frontend build passes
- runtime validation passed for the implemented v1 scope
