package com.cgi.intranet.planning.dto.response;

import java.time.LocalDateTime;

public record PlanningNotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        String actionUrl,
        boolean read,
        LocalDateTime createdAt
) {
}
