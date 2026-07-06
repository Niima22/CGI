package com.cgi.intranet.messaging.dto.response;

import java.time.LocalDateTime;

public record ParticipantResponse(
        Long userId,
        LocalDateTime joinedAt,
        boolean active,
        LocalDateTime lastReadAt
) {
}
