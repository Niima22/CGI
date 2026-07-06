package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.TicketPriority;

public record TicketPriorityDistributionResponse(
        TicketPriority priority,
        String priorityLabel,
        long count
) {
}
