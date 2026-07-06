package com.cgi.intranet.ticket.dto.response;

import java.time.LocalDateTime;

public record TicketDashboardSummaryResponse(
        long totalTickets,
        long openTickets,
        long todoTickets,
        long assignedTickets,
        long inProgressTickets,
        long waitingTickets,
        long resolvedTickets,
        long closedTickets,
        long cancelledTickets,
        long createdToday,
        long resolvedToday,
        long closedToday,
        Double averageTreatmentMinutes,
        LocalDateTime generatedAt
) {
}
