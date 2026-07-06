# Module 6 - Notifications & Alerts Validation

## 0. Validation metadata

- Test date: `2026-07-02`
- Services started:
  - `discovery-service`
  - `auth-user-service`
  - `employee-service`
  - `ticket-service`
  - `sla-service`
  - `api-gateway`
  - `ai-service`
  - `frontend`
  - `Keycloak`
  - `PostgreSQL (Docker)`
- Health checks observed:
  - `frontend`: `200`
  - `ai-service`: `200`
  - `eureka`: `200`
  - `auth-user-service`: `200`
  - `employee-service`: `200`
  - `ticket-service`: `200`
  - `sla-service`: `200`
- Test users used:
  - `pilote@cgi.local` (`ADMIN`)
  - `superviseur@cgi.local` (`MANAGER`)
  - `agent@cgi.local` (`EMPLOYEE`, employee A)
  - `agentb.module6@cgi.local` (`EMPLOYEE`, employee B, created for validation)
- Test ticket references used:
  - `TCK-2026-000002`
  - `TCK-2026-000003`
  - `TCK-2026-000004`
  - `DEMO-KPI-003`
  - `DEMO-KPI-004`
  - `DEMO-KPI-005`
  - `DEMO-KPI-006`
  - `DEMO-KPI-008`
- Temporary configuration values used for pending reminder validation:
  - `ticket.pending-reminder.age-minutes=1`
  - `ticket.pending-reminder.delay-ms=10000`
  - restored afterward by restarting the standard dev stack
- Log references:
  - `.run/ticket-service.out.log`
  - `.run/ticket-service-pending-test.out.log`
- Screenshots:
  - none captured during this run

## 1. Implemented scope

The current Module 6 implementation covers:

- SLA at risk
- SLA breached
- SLA escalation level 1
- SLA escalation level 2
- ticket assignment
- ticket reassignment
- ticket status update
- pending ticket reminder
- in-app notification bell
- unread counter
- mark one as read
- mark all as read
- ticket navigation link

## 2. Manual test checklist

### SLA

- Verify SLA at risk notification.
- Verify SLA breached notification.
- Verify escalation level 1 notification.
- Verify escalation level 2 notification.

### Ticket operations

- Assign an unassigned ticket.
- Reassign a ticket to another user.
- Change ticket status as another user.
- Verify pending reminder for `WAITING_REQUESTER`.
- Verify pending reminder for `WAITING_PROVIDER`.
- Verify pending reminder for `WAITING_MANAGER_VALIDATION`.

### Frontend bell

- Verify unread counter increases.
- Verify title and message display correctly.
- Verify French `typeLabel` displays correctly.
- Verify raw enums are never displayed.
- Mark one notification as read.
- Mark all notifications as read.
- Open ticket detail from notification.
- Verify polling refreshes the bell.

## 3. Negative test cases

- No notification when assignment does not change.
- No status notification when status does not change.
- No status notification when the assigned user performs their own status update.
- No pending reminder without `assignedUserId`.
- No pending reminder outside `WAITING_*` statuses.
- No duplicate notification for the same recipient, ticket and type.

## 4. Test configuration

Relevant configuration properties:

- `ticket.pending-reminder.delay-ms`
- default: `60000`
- `ticket.pending-reminder.age-minutes`
- default: `1440`

Manual validation method used during this run:

- `ticket.pending-reminder.age-minutes` was temporarily lowered to `1`
- `ticket.pending-reminder.delay-ms` was temporarily lowered to `10000`
- positive reminder cases were prepared by placing tickets in `WAITING_*` statuses and backdating `updatedAt`
- the standard stack configuration was restored after the check

## 5. Current limitations

- email is not implemented
- push is not implemented
- planning notifications are not implemented
- planning-service is still incomplete or mocked
- notification-service is currently unused
- in-app notifications are handled by ticket-service
- the unique constraint allows only one notification per recipient, ticket and type
- the self-status negative case could not be validated end-to-end because an `EMPLOYEE` update attempt on an assigned ticket returned `403 Forbidden`; the rule remains covered by automated unit tests

## 6. Recommended test data

Prepared or reused during validation:

- one `ADMIN`
- one `MANAGER`
- two assignable `EMPLOYEE` users
- one unassigned ticket
- one assigned ticket
- one ticket with existing SLA at-risk history
- one ticket with existing SLA breach history
- several tickets in `WAITING_*` statuses
- one ticket without an assigned user

## 7. Defects found

### DEFECT-01 - notification enum schema mismatch

- Symptom:
  - assigning ticket `TCK-2026-000002` initially returned `500 Internal Server Error`
- Root cause:
  - PostgreSQL constraint `notifications_type_check` still reflected the old enum set and rejected `TICKET_ASSIGNED`
- Fix applied:
  - added startup schema compatibility runner to refresh `notifications_type_check` from `NotificationType`
- File changed:
  - `backend/ticket-service/src/main/java/com/cgi/intranet/ticket/config/NotificationSchemaCompatibilityRunner.java`
- Validation after fix:
  - reran `ticket-service` build with tests: `BUILD SUCCESS`

## 8. Validation result table

| Test | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|
| SLA at risk notification | Assigned user receives an in-app notification with correct French title, message, and type label. | Existing `SLA_AT_RISK` notification observed for `agent@cgi.local` on `TCK-2026-000004` with French title/message/type label. | PASS | Validated through existing data already present in notifications, not re-triggered live. |
| SLA breached notification | Assigned user receives an in-app notification for SLA breach. | Existing `SLA_BREACHED` notification observed for `agent@cgi.local` on `DEMO-KPI-007` with French title/message/type label. | PASS | Validated through existing data already present in notifications, not re-triggered live. |
| SLA escalation level 1 | Escalation recipients receive level 1 notification. | Existing `SLA_ESCALATION_LEVEL_1` notification observed for `superviseur@cgi.local` on `DEMO-KPI-008`. | PASS | Validated through existing data already present in notifications, not re-triggered live. |
| SLA escalation level 2 | Escalation recipients receive level 2 notification. | Existing `SLA_ESCALATION_LEVEL_2` notification observed for `pilote@cgi.local` on `DEMO-KPI-007`. | PASS | Validated through existing data already present in notifications, not re-triggered live. |
| Assign unassigned ticket | New assigned user receives `TICKET_ASSIGNED` in-app notification. | `TCK-2026-000002` assigned by `ADMIN` to employee A; notification `id=51` created for `agent@cgi.local` with title `Ticket affecte`. | PASS | Runtime flow failed first because of schema constraint defect, then passed after fix. |
| Reassign ticket | New assigned user receives `TICKET_REASSIGNED` in-app notification. | `TCK-2026-000002` reassigned from employee A to employee B; notification `id=52` created for `agentb.module6@cgi.local`. Employee A did not receive a reassignment notification. | PASS | Ticket link from the bell opened `/tickets/2`. |
| Status change by another user | Assigned user receives `TICKET_STATUS_UPDATED` notification. | `ADMIN` changed `TCK-2026-000002` to `IN_PROGRESS`; notification `id=53` created for employee B with message containing `TCK-2026-000002` and `En cours`. | PASS | Existing history behavior remained intact. |
| Pending reminder - WAITING_REQUESTER | Assigned user receives `TICKET_PENDING_REMINDER` after configured delay/age threshold. | Reminder `id=61` created for employee A on `DEMO-KPI-004`. | PASS | Verified with temporary config `age-minutes=1`, `delay-ms=10000`. |
| Pending reminder - WAITING_PROVIDER | Assigned user receives `TICKET_PENDING_REMINDER` after configured delay/age threshold. | Reminder `id=63` created for employee B on `DEMO-KPI-008`. | PASS | Ticket was placed in `WAITING_PROVIDER` and aged for the scheduler test. |
| Pending reminder - WAITING_MANAGER_VALIDATION | Assigned user receives `TICKET_PENDING_REMINDER` after configured delay/age threshold. | Reminder `id=64` created for employee B on `DEMO-KPI-003`. | PASS | Ticket was placed in `WAITING_MANAGER_VALIDATION` and aged for the scheduler test. |
| Unread counter increase | Bell counter increases when a new unread notification exists. | Bell badge observed at `2` after creating unread notifications; polling test later moved badge from `null` to `1` without reload. | PASS | Frontend call to `/api/notifications` returned `200`. |
| Title and message rendering | Notification bell shows the backend title and message correctly. | Bell displayed `Statut du ticket mis a jour` and `Le statut du ticket TCK-2026-000002 est passe a En cours.` | PASS | Observed in browser session for employee B. |
| French typeLabel rendering | Notification bell shows French `typeLabel` or French fallback label. | Bell displayed `Mise a jour du statut` and `Ticket reaffecte`. | PASS | No backend enum value was shown to the user. |
| Raw enum suppression | UI never shows raw values such as `TICKET_ASSIGNED` or `SLA_AT_RISK`. | Browser check returned `noRawEnum=true` for the notification bell content. | PASS | Validated on new operational notification types. |
| Mark one as read | A single notification changes to read state and unread count decreases. | Bell badge went from `1` to no badge after clicking `Marquer comme lu` in the dropdown. | PASS | Observed on employee B after creating one unread test notification. |
| Mark all as read | All notifications change to read state and unread count becomes zero. | Bell badge went from `2` to no badge after clicking `Tout marquer comme lu`. | PASS | Observed on employee B after creating two unread test notifications. |
| Ticket navigation link | Clicking `Voir le ticket` opens the related ticket detail page. | Bell link opened `/tickets/2` successfully from employee B session. | PASS | Verified in browser. |
| Bell polling refresh | Bell refreshes automatically and shows newly created notifications. | With employee B logged in and badge initially empty, a backend-triggered notification appeared and the badge changed from `null` to `1` without page reload. | PASS | Observed after waiting for the 60s frontend polling interval. |
| No notification when assignment does not change | No assignment or reassignment notification is created. | Repeating `assignedUserId=3` on `TCK-2026-000002` created no extra assignment notification. | PASS | Count for `TICKET_ASSIGNED` on ticket 2 remained `1`. |
| No status notification when status does not change | No status update notification is created. | Repeating `status=IN_PROGRESS` on `TCK-2026-000002` created no extra status notification. | PASS | Count for `TICKET_STATUS_UPDATED` on ticket 2 remained `1`. |
| No self-status notification | Assigned user does not receive a status notification for their own action. | End-to-end self-update could not be completed because the `EMPLOYEE` request returned `403 Forbidden`. | BLOCKED | Business rule remains covered by automated unit test `TicketServiceImplNotificationTest`. |
| No pending reminder without assigned user | No reminder is created when `assignedUserId` is null. | `TCK-2026-000001` was placed in `WAITING_REQUESTER`, backdated, and produced no `TICKET_PENDING_REMINDER`. | PASS | Negative scheduler case validated. |
| No pending reminder outside WAITING statuses | No reminder is created for statuses outside `WAITING_*`. | `TCK-2026-000004` stayed in `ASSIGNED`, was backdated, and produced no `TICKET_PENDING_REMINDER`. | PASS | Negative scheduler case validated. |
| No duplicate notification for same recipient/ticket/type | Only one notification exists for the same recipient, ticket, and type. | After a second scheduler cycle, reminder counts stayed at `1` for tickets `DEMO-KPI-004`, `DEMO-KPI-008`, `DEMO-KPI-003`, and later `TCK-2026-000002`. | PASS | Confirms current uniqueness rule and the limitation on repeated pending reminders. |
