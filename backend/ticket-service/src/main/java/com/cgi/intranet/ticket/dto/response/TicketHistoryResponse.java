package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.TicketHistoryActionType;

import java.time.LocalDateTime;

public record TicketHistoryResponse(
        Long id,
        Long ticketId,
        TicketHistoryActionType actionType,
        String actionTypeLabel,
        String oldValue,
        String newValue,
        String comment,
        Long performedBy,
        LocalDateTime createdAt
) {
}
