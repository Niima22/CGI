from __future__ import annotations

import json

from app.data.database import get_connection, init_db
from app.models.schemas import TicketCreateRequest, TicketResponse


class TicketService:
    def create_ticket(self, request: TicketCreateRequest, user_id: int | None) -> TicketResponse:
        init_db()
        with get_connection() as connection:
            row = connection.execute(
                """
                INSERT INTO tickets (
                    id, title, bannette, synthese, actions, outils, resolution_frame, created_by
                )
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    bannette = EXCLUDED.bannette,
                    synthese = EXCLUDED.synthese,
                    actions = EXCLUDED.actions,
                    outils = EXCLUDED.outils,
                    resolution_frame = EXCLUDED.resolution_frame
                RETURNING id, title, bannette, synthese, actions, outils, resolution_frame, created_at
                """,
                (
                    request.id,
                    request.title,
                    request.department,
                    request.summary,
                    json.dumps(request.actions),
                    request.tools or "",
                    request.resolution_frame,
                    user_id,
                ),
            ).fetchone()

        return self._to_response(row)

    def list_tickets(self) -> list[TicketResponse]:
        init_db()
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT
                    tickets.id,
                    tickets.title,
                    tickets.bannette,
                    tickets.synthese,
                    tickets.actions,
                    tickets.outils,
                    tickets.resolution_frame,
                    tickets.created_at,
                    users.email AS created_by_email
                FROM tickets
                LEFT JOIN users ON users.id = tickets.created_by
                ORDER BY tickets.created_at DESC
                """
            ).fetchall()

        return [self._to_response(row) for row in rows]

    def _to_response(self, row) -> TicketResponse:
        actions = row["actions"]
        if isinstance(actions, str):
            actions = json.loads(actions)

        return TicketResponse(
            id=row["id"],
            title=row["title"],
            department=row["bannette"],
            summary=row["synthese"],
            actions=actions,
            tools=row["outils"] or "",
            resolution_frame=row["resolution_frame"],
            created_at=row["created_at"].isoformat(),
            created_by_email=row.get("created_by_email"),
        )
