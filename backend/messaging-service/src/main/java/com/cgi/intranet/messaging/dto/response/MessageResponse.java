package com.cgi.intranet.messaging.dto.response;

import java.time.LocalDateTime;

public record MessageResponse(
        Long id,
        Long conversationId,
        Long senderUserId,
        String content,
        boolean urgent,
        LocalDateTime createdAt,
        LocalDateTime editedAt,
        LocalDateTime deletedAt,
        boolean ownMessage
) {
}
