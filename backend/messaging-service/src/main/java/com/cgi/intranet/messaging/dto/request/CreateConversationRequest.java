package com.cgi.intranet.messaging.dto.request;

import com.cgi.intranet.messaging.enums.ConversationType;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateConversationRequest(
        ConversationType type,
        @Size(max = 180, message = "Le titre ne doit pas depasser 180 caracteres")
        String title,
        List<Long> participantUserIds,
        Long ticketId,
        @Size(max = 4000, message = "Le message initial ne doit pas depasser 4000 caracteres")
        String initialMessage,
        Boolean urgent
) {
}
