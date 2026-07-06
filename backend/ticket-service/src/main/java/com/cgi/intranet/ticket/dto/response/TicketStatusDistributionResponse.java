package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.TicketStatus;

public record TicketStatusDistributionResponse(
        TicketStatus status,
        String statusLabel,
        long count
) {
}
