package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.SlaStatus;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketStatus;

import java.time.LocalDateTime;

public record SlaUrgentTicketResponse(
        Long ticketId,
        String ticketReference,
        String ticketTitle,
        TicketStatus status,
        String statusLabel,
        TicketPriority priority,
        String priorityLabel,
        TicketCriticality criticality,
        String criticalityLabel,
        SlaStatus globalStatus,
        String globalStatusLabel,
        Long remainingMinutes,
        Double consumedPercentage,
        LocalDateTime resolutionDeadline,
        Long assignedUserId
) {
}
