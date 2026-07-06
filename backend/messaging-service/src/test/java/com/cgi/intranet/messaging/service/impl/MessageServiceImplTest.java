package com.cgi.intranet.messaging.service.impl;

import com.cgi.intranet.messaging.client.TicketClient;
import com.cgi.intranet.messaging.dto.request.SendMessageRequest;
import com.cgi.intranet.messaging.entity.Conversation;
import com.cgi.intranet.messaging.entity.ConversationParticipant;
import com.cgi.intranet.messaging.entity.Message;
import com.cgi.intranet.messaging.enums.ConversationType;
import com.cgi.intranet.messaging.exception.ConversationAccessDeniedException;
import com.cgi.intranet.messaging.exception.InvalidConversationRequestException;
import com.cgi.intranet.messaging.repository.ConversationParticipantRepository;
import com.cgi.intranet.messaging.repository.ConversationRepository;
import com.cgi.intranet.messaging.repository.MessageRepository;
import com.cgi.intranet.messaging.service.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MessageServiceImplTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationParticipantRepository participantRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private TicketClient ticketClient;

    private MessageServiceImpl messageService;

    @BeforeEach
    void setUp() {
        messageService = new MessageServiceImpl(
                messageRepository,
                conversationRepository,
                participantRepository,
                currentUserService,
                ticketClient
        );
        when(currentUserService.getCurrentUser()).thenReturn(new CurrentUserService.CurrentUser(3L, "kc-3", false, false, true));
        when(conversationRepository.existsById(10L)).thenReturn(true);
        when(participantRepository.findActiveMembershipWithConversation(10L, 3L))
                .thenReturn(Optional.of(activeMembership(10L, 3L, ConversationType.DIRECT, null)));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            ReflectionTestUtils.setField(message, "id", 88L);
            ReflectionTestUtils.setField(message, "createdAt", LocalDateTime.now());
            return message;
        });
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void sendMessageUsesCurrentUserAsSenderAndPreservesUrgentFlag() {
        SendMessageRequest request = new SendMessageRequest("Message urgent", true);

        messageService.sendMessage(10L, request);

        ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(captor.capture());
        assertThat(captor.getValue().getSenderUserId()).isEqualTo(3L);
        assertThat(captor.getValue().isUrgent()).isTrue();
    }

    @Test
    void sendMessageRejectsBlankMessage() {
        assertThatThrownBy(() -> messageService.sendMessage(10L, new SendMessageRequest("   ", false)))
                .isInstanceOf(InvalidConversationRequestException.class);

        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    void listConversationMessagesReturnsChronologicalMessagesWithOwnFlag() {
        Message ownMessage = message(10L, 3L, "m1", false, LocalDateTime.now().minusMinutes(2));
        Message otherMessage = message(10L, 5L, "m2", true, LocalDateTime.now().minusMinutes(1));
        when(messageRepository.findByConversationIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(10L, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(ownMessage, otherMessage)));

        var result = messageService.listConversationMessages(10L, PageRequest.of(0, 20));

        assertThat(result.content()).hasSize(2);
        assertThat(result.content().get(0).ownMessage()).isTrue();
        assertThat(result.content().get(1).ownMessage()).isFalse();
        assertThat(result.page()).isEqualTo(0);
    }

    @Test
    void markConversationReadUpdatesLastReadAt() {
        ConversationParticipant participant = activeMembership(10L, 3L, ConversationType.DIRECT, null);
        when(participantRepository.findActiveMembershipWithConversation(10L, 3L)).thenReturn(Optional.of(participant));
        when(participantRepository.save(any(ConversationParticipant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = messageService.markConversationRead(10L);

        assertThat(response.lastReadAt()).isNotNull();
    }

    @Test
    void unreadCountUsesRepositoryValue() {
        when(messageRepository.countUnreadMessagesForUser(3L)).thenReturn(4L);

        var response = messageService.getCurrentUserUnreadTotal();

        assertThat(response.unreadCount()).isEqualTo(4L);
    }

    @Test
    void nonParticipantCannotSendMessage() {
        when(participantRepository.findActiveMembershipWithConversation(10L, 3L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.sendMessage(10L, new SendMessageRequest("Test", false)))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    @Test
    void activeParticipantWithoutTicketAccessCannotReadMessages() {
        when(participantRepository.findActiveMembershipWithConversation(10L, 3L))
                .thenReturn(Optional.of(activeMembership(10L, 3L, ConversationType.TICKET, 99L)));
        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse a ce ticket"))
                .when(ticketClient).ensureTicketReadable(99L);

        assertThatThrownBy(() -> messageService.listConversationMessages(10L, PageRequest.of(0, 20)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403 FORBIDDEN");
    }

    @Test
    void ticketAccessButNonParticipantIsRejected() {
        when(participantRepository.findActiveMembershipWithConversation(10L, 3L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.listConversationMessages(10L, PageRequest.of(0, 20)))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    private ConversationParticipant activeMembership(Long conversationId, Long userId, ConversationType type, Long ticketId) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setConversation(conversation(conversationId, type, ticketId));
        participant.setUserId(userId);
        participant.setActive(true);
        ReflectionTestUtils.setField(participant, "joinedAt", LocalDateTime.now().minusDays(1));
        return participant;
    }

    private Conversation conversation(Long conversationId, ConversationType type, Long ticketId) {
        Conversation conversation = new Conversation();
        ReflectionTestUtils.setField(conversation, "id", conversationId);
        ReflectionTestUtils.setField(conversation, "createdAt", LocalDateTime.now().minusDays(2));
        ReflectionTestUtils.setField(conversation, "updatedAt", LocalDateTime.now().minusHours(1));
        conversation.setType(type);
        conversation.setTicketId(ticketId);
        conversation.setCreatedByUserId(1L);
        return conversation;
    }

    private Message message(Long conversationId, Long senderUserId, String content, boolean urgent, LocalDateTime createdAt) {
        Message message = new Message();
        ReflectionTestUtils.setField(message, "id", senderUserId + 100);
        ReflectionTestUtils.setField(message, "createdAt", createdAt);
        message.setConversation(conversation(conversationId, ConversationType.DIRECT, null));
        message.setSenderUserId(senderUserId);
        message.setContent(content);
        message.setUrgent(urgent);
        return message;
    }
}
