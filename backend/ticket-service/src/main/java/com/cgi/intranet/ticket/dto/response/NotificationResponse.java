package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        Long ticketId,
        NotificationType type,
        String typeLabel,
        String title,
        String message,
        boolean read,
        LocalDateTime createdAt,
        LocalDateTime readAt
) {
}
