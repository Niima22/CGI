# Messaging Service

## Scope

Module 7 Phase 2 provides the backend REST v1 foundation for internal messaging.

Implemented in this phase:

- direct conversations
- group conversations
- one ticket conversation per ticket
- message history
- urgent message flag
- read state per participant
- unread counts
- conversation-level authorization
- health endpoint

Still deferred:

- frontend messaging UI
- WebSocket/STOMP/SSE realtime
- attachments
- participant management
- ticket visibility verification through `ticket-service`
- Kafka
- email
- push

## Service identity

- Service name: `messaging-service`
- Application port: `8086`
- Health endpoint: `GET /api/messages/health`

## Domain model

### Conversation

- `id`
- `type`
- `title`
- `ticketId`
- `createdByUserId`
- `createdAt`
- `updatedAt`

### ConversationType

- `DIRECT`
- `GROUP`
- `TICKET`

### ConversationParticipant

- `id`
- `conversation`
- `userId`
- `joinedAt`
- `active`
- `lastReadAt`

### Message

- `id`
- `conversation`
- `senderUserId`
- `content`
- `urgent`
- `createdAt`
- `editedAt`
- `deletedAt`

## Ticket thread rule

Module 7 v1 uses one conversation per ticket.

Rules:

- a `TICKET` conversation must have a non-null `ticketId`
- `ticketId` is unique in `conversations`
- `GET /api/messages/tickets/{ticketId}/conversation` never auto-creates a thread
- `POST /api/messages/tickets/{ticketId}/conversation` rejects duplicates with `409 Conflict`

Ticket visibility integration with `ticket-service` is still deferred. In this phase, access is controlled only by messaging participants.

## Database constraints and indexes

Constraints:

- unique participant by `conversation_id + user_id`
- unique ticket conversation by `ticket_id`
- `sender_user_id` is non-null
- participant `user_id` is non-null
- message `content` must not be blank
- `TICKET` conversation requires non-null `ticketId`

Indexes:

- participant index on `user_id`
- message index on `conversation_id, created_at`

## Security and authorization

- JWT/Keycloak resource server aligned with the other backend services
- supported roles:
  - `ROLE_ADMIN`
  - `ROLE_MANAGER`
  - `ROLE_EMPLOYEE`
- `/api/messages/**` requires authentication except `GET /api/messages/health`
- current user resolution delegates to `auth-user-service` to resolve the local user profile id

Conversation-level authorization rules:

- only active participants can read a conversation
- only active participants can list messages
- only active participants can send messages
- only active participants can mark a conversation as read
- inactive participants are treated as non-members

Response rules:

- `403 Forbidden` for authenticated non-members
- `404 Not Found` for missing conversations
- `400 Bad Request` for invalid creation or message payloads
- `409 Conflict` for duplicate ticket thread creation

## REST endpoints

### Conversations

- `GET /api/messages/conversations`
- `POST /api/messages/conversations`
- `GET /api/messages/conversations/{conversationId}`

### Messages

- `GET /api/messages/conversations/{conversationId}/messages`
- `POST /api/messages/conversations/{conversationId}/messages`
- `PATCH /api/messages/conversations/{conversationId}/read`

### Ticket conversations

- `GET /api/messages/tickets/{ticketId}/conversation`
- `POST /api/messages/tickets/{ticketId}/conversation`

### Unread

- `GET /api/messages/unread-count`

## Request and response examples

Create a direct conversation:

```json
{
  "type": "DIRECT",
  "participantUserIds": [3],
  "initialMessage": "Bonjour",
  "urgent": false
}
```

Create a group conversation:

```json
{
  "type": "GROUP",
  "title": "Equipe support",
  "participantUserIds": [3, 5],
  "initialMessage": "Point rapide",
  "urgent": false
}
```

Create a ticket conversation:

```json
{
  "type": "TICKET",
  "participantUserIds": [3, 5],
  "initialMessage": "Suivi du ticket",
  "urgent": true
}
```

Send a message:

```json
{
  "content": "Merci pour le retour",
  "urgent": false
}
```

Conversation response shape:

```json
{
  "id": 12,
  "type": "GROUP",
  "title": "Equipe support",
  "ticketId": null,
  "createdByUserId": 1,
  "createdAt": "2026-07-03T11:00:00",
  "updatedAt": "2026-07-03T11:05:00",
  "participants": [
    {
      "userId": 1,
      "joinedAt": "2026-07-03T11:00:00",
      "active": true,
      "lastReadAt": "2026-07-03T11:05:00"
    }
  ],
  "lastMessagePreview": "Merci pour le retour",
  "lastMessageAt": "2026-07-03T11:05:00",
  "unreadCount": 0
}
```

## Conversation creation rules

- `DIRECT` requires exactly one other participant besides the current user
- `GROUP` requires a non-blank title
- `GROUP` requires at least one other participant
- `TICKET` creation uses the dedicated ticket endpoint
- duplicate participant ids are deduplicated
- the current user is always added automatically
- direct conversation creation reuses an existing active direct thread where practical

## Message rules

- sender id always comes from the authenticated user
- blank messages are rejected
- maximum content length is `4000`
- urgent messages preserve the `urgent` flag
- sending a message updates `conversation.updatedAt`
- soft-deleted messages are excluded from normal history

## Read state and unread count

- each participant stores `lastReadAt`
- `PATCH /api/messages/conversations/{conversationId}/read` updates `lastReadAt` for the current user
- unread count excludes messages sent by the current user
- unread count includes only non-deleted messages created after `lastReadAt`
- if `lastReadAt` is null, all non-deleted messages from other users count as unread

## Build and run

Build:

```powershell
& 'C:\Users\proem\AppData\Local\Programs\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin\mvn.cmd' -f backend\messaging-service\pom.xml clean package
```

Run locally:

```powershell
java -jar backend\messaging-service\target\messaging-service-0.0.1-SNAPSHOT.jar
```
