package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketType;

import java.time.LocalDateTime;

public record SlaPolicyResponse(
        Long id,
        String name,
        TicketType incidentType,
        String incidentTypeLabel,
        TicketPriority priority,
        String priorityLabel,
        TicketCriticality criticality,
        String criticalityLabel,
        Integer responseTimeMinutes,
        Integer resolutionTimeMinutes,
        Integer warningThresholdPercent,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
