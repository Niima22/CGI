package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.enums.TicketType;

import java.time.LocalDateTime;

public record TicketResponse(
        Long id,
        String reference,
        String title,
        String description,
        TicketStatus status,
        String statusLabel,
        TicketType type,
        String typeLabel,
        String category,
        String subCategory,
        TicketPriority priority,
        String priorityLabel,
        TicketCriticality criticality,
        String criticalityLabel,
        Long requesterId,
        Long assignedUserId,
        Long assignedTeamId,
        Long departmentId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime assignedAt,
        LocalDateTime startedAt,
        LocalDateTime resolvedAt,
        LocalDateTime closedAt
) {
}
