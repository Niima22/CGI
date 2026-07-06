package com.cgi.intranet.messaging.service;

import com.cgi.intranet.messaging.dto.request.SendMessageRequest;
import com.cgi.intranet.messaging.dto.response.MessageResponse;
import com.cgi.intranet.messaging.dto.response.PagedResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;
import com.cgi.intranet.messaging.dto.response.UnreadCountResponse;
import org.springframework.data.domain.Pageable;

public interface MessageService {

    PagedResponse<MessageResponse> listConversationMessages(Long conversationId, Pageable pageable);

    MessageResponse sendMessage(Long conversationId, SendMessageRequest request);

    ParticipantResponse markConversationRead(Long conversationId);

    UnreadCountResponse getCurrentUserUnreadTotal();
}
