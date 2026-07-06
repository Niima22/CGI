package com.cgi.intranet.messaging.dto.response;

import com.cgi.intranet.messaging.enums.ConversationType;

import java.time.LocalDateTime;
import java.util.List;

public record ConversationResponse(
        Long id,
        ConversationType type,
        String title,
        Long ticketId,
        Long createdByUserId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<ParticipantResponse> participants,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        Boolean lastMessageUrgent,
        long unreadCount
) {
}
