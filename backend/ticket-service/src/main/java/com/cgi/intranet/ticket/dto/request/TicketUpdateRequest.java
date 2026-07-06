package com.cgi.intranet.ticket.dto.request;

import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.enums.TicketType;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TicketUpdateRequest(
        @Pattern(regexp = ".*\\S.*", message = "title must not be blank")
        @Size(max = 180, message = "title must not exceed 180 characters")
        String title,
        @Pattern(regexp = ".*\\S.*", message = "description must not be blank")
        @Size(max = 5000, message = "description must not exceed 5000 characters")
        String description,
        TicketType type,
        @Size(max = 120, message = "category must not exceed 120 characters")
        String category,
        @Size(max = 120, message = "subCategory must not exceed 120 characters")
        String subCategory,
        TicketStatus status,
        TicketPriority priority,
        TicketCriticality criticality,
        Long assignedUserId,
        Long assignedTeamId,
        Long departmentId
) {
}
