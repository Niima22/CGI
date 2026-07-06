package com.cgi.intranet.ticket.dto.request;

import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TicketCreateRequest(
        @NotBlank(message = "title is required")
        @Size(max = 180, message = "title must not exceed 180 characters")
        String title,
        @NotBlank(message = "description is required")
        @Size(max = 5000, message = "description must not exceed 5000 characters")
        String description,
        TicketType type,
        @Size(max = 120, message = "category must not exceed 120 characters")
        String category,
        @Size(max = 120, message = "subCategory must not exceed 120 characters")
        String subCategory,
        TicketPriority priority,
        TicketCriticality criticality,
        Long departmentId
) {
}
