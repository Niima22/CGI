package com.cgi.intranet.messaging.service;

import com.cgi.intranet.messaging.dto.request.CreateConversationRequest;
import com.cgi.intranet.messaging.dto.request.ParticipantRequest;
import com.cgi.intranet.messaging.dto.response.ConversationResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;

import java.util.List;

public interface ConversationService {

    List<ConversationResponse> listCurrentUserConversations();

    ConversationResponse getConversation(Long conversationId);

    ConversationResponse createConversation(CreateConversationRequest request);

    ConversationResponse getTicketConversation(Long ticketId);

    ConversationResponse createTicketConversation(Long ticketId, CreateConversationRequest request);

    List<ParticipantResponse> listParticipants(Long conversationId);

    ParticipantResponse addParticipant(Long conversationId, ParticipantRequest request);

    ParticipantResponse removeParticipant(Long conversationId, Long userId);

    void validateMembership(Long conversationId);
}
