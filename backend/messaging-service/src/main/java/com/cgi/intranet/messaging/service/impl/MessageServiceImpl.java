package com.cgi.intranet.messaging.service.impl;

import com.cgi.intranet.messaging.client.TicketClient;
import com.cgi.intranet.messaging.dto.request.SendMessageRequest;
import com.cgi.intranet.messaging.dto.response.MessageResponse;
import com.cgi.intranet.messaging.dto.response.PagedResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;
import com.cgi.intranet.messaging.dto.response.UnreadCountResponse;
import com.cgi.intranet.messaging.entity.Conversation;
import com.cgi.intranet.messaging.entity.ConversationParticipant;
import com.cgi.intranet.messaging.entity.Message;
import com.cgi.intranet.messaging.enums.ConversationType;
import com.cgi.intranet.messaging.exception.ConversationAccessDeniedException;
import com.cgi.intranet.messaging.exception.ConversationNotFoundException;
import com.cgi.intranet.messaging.exception.InvalidConversationRequestException;
import com.cgi.intranet.messaging.repository.ConversationParticipantRepository;
import com.cgi.intranet.messaging.repository.ConversationRepository;
import com.cgi.intranet.messaging.repository.MessageRepository;
import com.cgi.intranet.messaging.service.CurrentUserService;
import com.cgi.intranet.messaging.service.MessageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@Transactional(readOnly = true)
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final CurrentUserService currentUserService;
    private final TicketClient ticketClient;

    public MessageServiceImpl(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            CurrentUserService currentUserService,
            TicketClient ticketClient
    ) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.currentUserService = currentUserService;
        this.ticketClient = ticketClient;
    }

    @Override
    public PagedResponse<MessageResponse> listConversationMessages(Long conversationId, Pageable pageable) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ConversationParticipant membership = ensureActiveMembership(conversationId, currentUser.userId());
        ensureTicketReadableIfNeeded(membership.getConversation());
        Page<MessageResponse> page = messageRepository
                .findByConversationIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(conversationId, pageable)
                .map(message -> toMessageResponse(message, currentUser.userId()));
        return new PagedResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    @Override
    @Transactional
    public MessageResponse sendMessage(Long conversationId, SendMessageRequest request) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ConversationParticipant membership = ensureActiveMembership(conversationId, currentUser.userId());
        ensureTicketReadableIfNeeded(membership.getConversation());
        if (!StringUtils.hasText(request.content())) {
            throw new InvalidConversationRequestException("Le contenu du message ne peut pas etre vide");
        }

        Message message = new Message();
        message.setConversation(membership.getConversation());
        message.setSenderUserId(currentUser.userId());
        message.setContent(request.content().trim());
        message.setUrgent(Boolean.TRUE.equals(request.urgent()));
        Message savedMessage = messageRepository.save(message);

        Conversation conversation = membership.getConversation();
        conversation.touch();
        conversationRepository.save(conversation);

        return toMessageResponse(savedMessage, currentUser.userId());
    }

    @Override
    @Transactional
    public ParticipantResponse markConversationRead(Long conversationId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ConversationParticipant membership = ensureActiveMembership(conversationId, currentUser.userId());
        ensureTicketReadableIfNeeded(membership.getConversation());
        membership.setLastReadAt(LocalDateTime.now());
        ConversationParticipant saved = participantRepository.save(membership);
        return new ParticipantResponse(
                saved.getUserId(),
                saved.getJoinedAt(),
                saved.isActive(),
                saved.getLastReadAt()
        );
    }

    @Override
    public UnreadCountResponse getCurrentUserUnreadTotal() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        return new UnreadCountResponse(messageRepository.countUnreadMessagesForUser(currentUser.userId()));
    }

    private ConversationParticipant ensureActiveMembership(Long conversationId, Long userId) {
        if (!conversationRepository.existsById(conversationId)) {
            throw new ConversationNotFoundException(conversationId);
        }
        return participantRepository.findActiveMembershipWithConversation(conversationId, userId)
                .orElseThrow(ConversationAccessDeniedException::new);
    }

    private void ensureTicketReadableIfNeeded(Conversation conversation) {
        if (conversation.getType() == ConversationType.TICKET && conversation.getTicketId() != null) {
            ticketClient.ensureTicketReadable(conversation.getTicketId());
        }
    }

    private MessageResponse toMessageResponse(Message message, Long currentUserId) {
        return new MessageResponse(
                message.getId(),
                message.getConversation().getId(),
                message.getSenderUserId(),
                message.getContent(),
                message.isUrgent(),
                message.getCreatedAt(),
                message.getEditedAt(),
                message.getDeletedAt(),
                currentUserId.equals(message.getSenderUserId())
        );
    }
}
