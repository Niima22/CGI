package com.cgi.intranet.messaging.service.impl;

import com.cgi.intranet.messaging.client.AuthUserClient;
import com.cgi.intranet.messaging.client.TicketClient;
import com.cgi.intranet.messaging.dto.request.CreateConversationRequest;
import com.cgi.intranet.messaging.dto.request.ParticipantRequest;
import com.cgi.intranet.messaging.entity.Conversation;
import com.cgi.intranet.messaging.entity.ConversationParticipant;
import com.cgi.intranet.messaging.entity.Message;
import com.cgi.intranet.messaging.enums.ConversationType;
import com.cgi.intranet.messaging.exception.ConversationAccessDeniedException;
import com.cgi.intranet.messaging.exception.DuplicateTicketConversationException;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ConversationServiceImplTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationParticipantRepository participantRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private TicketClient ticketClient;

    @Mock
    private AuthUserClient authUserClient;

    private ConversationServiceImpl conversationService;

    @BeforeEach
    void setUp() {
        conversationService = new ConversationServiceImpl(
                conversationRepository,
                participantRepository,
                messageRepository,
                currentUserService,
                ticketClient,
                authUserClient
        );
        when(currentUserService.getCurrentUser()).thenReturn(new CurrentUserService.CurrentUser(1L, "kc-1", true, false, false));
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(invocation -> {
            Conversation conversation = invocation.getArgument(0);
            if (conversation.getId() == null) {
                ReflectionTestUtils.setField(conversation, "id", 99L);
            }
            if (conversation.getCreatedAt() == null) {
                ReflectionTestUtils.setField(conversation, "createdAt", LocalDateTime.now());
            }
            if (conversation.getUpdatedAt() == null) {
                ReflectionTestUtils.setField(conversation, "updatedAt", LocalDateTime.now());
            }
            return conversation;
        });
        when(participantRepository.save(any(ConversationParticipant.class))).thenAnswer(invocation -> {
            ConversationParticipant participant = invocation.getArgument(0);
            if (participant.getJoinedAt() == null) {
                ReflectionTestUtils.setField(participant, "joinedAt", LocalDateTime.now());
            }
            return participant;
        });
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                Jwt.withTokenValue("token")
                        .header("alg", "none")
                        .claim("sub", "kc-1")
                        .build(),
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        ));
    }

    @Test
    void createDirectConversationCreatesConversationAndAddsCurrentUserAutomatically() {
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.DIRECT,
                null,
                List.of(3L),
                null,
                "Bonjour",
                false
        );
        stubConversationLoad(99L, List.of(1L, 3L), 0L, null);
        when(conversationRepository.findDirectConversationForUsers(1L, 3L)).thenReturn(Optional.empty());

        conversationService.createConversation(request);

        verify(conversationRepository, times(2)).save(any(Conversation.class));
        verify(participantRepository, times(2)).save(any(ConversationParticipant.class));
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getSenderUserId()).isEqualTo(1L);
        assertThat(messageCaptor.getValue().getContent()).isEqualTo("Bonjour");
    }

    @Test
    void createDirectConversationReturnsExistingConversationWhenDuplicateExists() {
        Conversation existing = existingConversation(77L, ConversationType.DIRECT, null);
        when(conversationRepository.findDirectConversationForUsers(1L, 3L)).thenReturn(Optional.of(existing));
        stubConversationLoad(77L, List.of(1L, 3L), 0L, null);

        var response = conversationService.createConversation(new CreateConversationRequest(
                ConversationType.DIRECT,
                null,
                List.of(3L),
                null,
                null,
                null
        ));

        assertThat(response.id()).isEqualTo(77L);
        verify(conversationRepository, never()).save(argThat(conversation ->
                conversation != null && conversation.getType() == ConversationType.DIRECT
        ));
        verify(participantRepository, never()).save(any(ConversationParticipant.class));
        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    void createGroupConversationDeduplicatesParticipants() {
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.GROUP,
                "Equipe",
                List.of(3L, 3L, 5L, 1L),
                null,
                null,
                null
        );
        stubConversationLoad(99L, List.of(1L, 3L, 5L), 0L, null);

        conversationService.createConversation(request);

        verify(participantRepository, times(3)).save(any(ConversationParticipant.class));
        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    void createGroupConversationRejectsMissingTitle() {
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.GROUP,
                "   ",
                List.of(3L),
                null,
                null,
                null
        );

        assertThatThrownBy(() -> conversationService.createConversation(request))
                .isInstanceOf(InvalidConversationRequestException.class)
                .hasMessageContaining("titre");
    }

    @Test
    void createDirectConversationRejectsInvalidParticipantCount() {
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.DIRECT,
                null,
                List.of(3L, 5L),
                null,
                null,
                null
        );

        assertThatThrownBy(() -> conversationService.createConversation(request))
                .isInstanceOf(InvalidConversationRequestException.class)
                .hasMessageContaining("exactement un autre participant");
    }

    @Test
    void createTicketConversationRejectsDuplicate() {
        when(conversationRepository.existsTicketConversationByTicketId(12L)).thenReturn(true);

        assertThatThrownBy(() -> conversationService.createTicketConversation(
                12L,
                new CreateConversationRequest(ConversationType.TICKET, null, List.of(3L), null, null, null)
        ))
                .isInstanceOf(DuplicateTicketConversationException.class);
    }

    @Test
    void createTicketConversationAddsCurrentUserAndDeduplicatesParticipants() {
        when(conversationRepository.existsTicketConversationByTicketId(12L)).thenReturn(false);
        stubConversationLoad(99L, List.of(1L, 3L, 5L), 0L, null);

        conversationService.createTicketConversation(
                12L,
                new CreateConversationRequest(
                        ConversationType.TICKET,
                        null,
                        List.of(3L, 5L, 3L, 1L),
                        12L,
                        "Suivi ticket",
                        true
                )
        );

        verify(participantRepository, times(3)).save(any(ConversationParticipant.class));
        verify(ticketClient).ensureTicketReadable(12L);
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getSenderUserId()).isEqualTo(1L);
        assertThat(messageCaptor.getValue().isUrgent()).isTrue();
    }

    @Test
    void getTicketConversationRejectsWhenTicketAccessDenied() {
        when(conversationRepository.findTicketConversationByTicketId(12L))
                .thenReturn(Optional.of(existingConversation(66L, ConversationType.TICKET, 12L)));
        when(participantRepository.findActiveMembershipWithConversation(66L, 1L))
                .thenReturn(Optional.of(activeMembership(66L, 1L, ConversationType.TICKET, 12L)));
        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse a ce ticket"))
                .when(ticketClient).ensureTicketReadable(12L);

        assertThatThrownBy(() -> conversationService.getTicketConversation(12L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403 FORBIDDEN");
    }

    @Test
    void addParticipantAllowsCreatorToReactivateInactiveMember() {
        Conversation conversation = existingConversation(44L, ConversationType.GROUP, null);
        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(participantRepository.findActiveMembershipWithConversation(44L, 1L))
                .thenReturn(Optional.of(activeMembership(44L, 1L, ConversationType.GROUP, null)));
        ConversationParticipant inactive = activeMembership(44L, 7L, ConversationType.GROUP, null);
        inactive.setActive(false);
        when(participantRepository.findByConversationIdAndUserId(44L, 7L)).thenReturn(Optional.of(inactive));
        when(participantRepository.save(any(ConversationParticipant.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(authUserClient.getActiveMessagingDirectoryUser("Bearer token", 7L))
                .thenReturn(new AuthUserClient.MessagingDirectoryUserSnapshot(7L, "User 7", "u7@cgi.local", "EMPLOYEE"));

        var response = conversationService.addParticipant(44L, new ParticipantRequest(7L));

        assertThat(response.userId()).isEqualTo(7L);
        assertThat(response.active()).isTrue();
    }

    @Test
    void unauthorizedParticipantAddIsRejected() {
        when(currentUserService.getCurrentUser()).thenReturn(new CurrentUserService.CurrentUser(9L, "kc-9", false, false, true));
        Conversation conversation = existingConversation(44L, ConversationType.GROUP, null);
        ReflectionTestUtils.setField(conversation, "createdByUserId", 1L);
        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(participantRepository.findActiveMembershipWithConversation(44L, 9L))
                .thenReturn(Optional.of(activeMembership(44L, 9L, ConversationType.GROUP, null)));

        assertThatThrownBy(() -> conversationService.addParticipant(44L, new ParticipantRequest(7L)))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    @Test
    void removeParticipantMarksMembershipInactive() {
        Conversation conversation = existingConversation(44L, ConversationType.GROUP, null);
        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(participantRepository.findActiveMembershipWithConversation(44L, 1L))
                .thenReturn(Optional.of(activeMembership(44L, 1L, ConversationType.GROUP, null)));
        ConversationParticipant participant = activeMembership(44L, 7L, ConversationType.GROUP, null);
        when(participantRepository.findByConversationIdAndUserId(44L, 7L)).thenReturn(Optional.of(participant));
        when(participantRepository.save(any(ConversationParticipant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = conversationService.removeParticipant(44L, 7L);

        assertThat(response.active()).isFalse();
    }

    @Test
    void removeParticipantRejectsDirectConversation() {
        Conversation conversation = existingConversation(44L, ConversationType.DIRECT, null);
        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(participantRepository.findActiveMembershipWithConversation(44L, 1L))
                .thenReturn(Optional.of(activeMembership(44L, 1L, ConversationType.DIRECT, null)));

        assertThatThrownBy(() -> conversationService.removeParticipant(44L, 7L))
                .isInstanceOf(InvalidConversationRequestException.class)
                .hasMessageContaining("conversation directe");
    }

    @Test
    void removeParticipantRejectsTicketConversation() {
        Conversation conversation = existingConversation(44L, ConversationType.TICKET, 12L);
        when(conversationRepository.findById(44L)).thenReturn(Optional.of(conversation));
        when(participantRepository.findActiveMembershipWithConversation(44L, 1L))
                .thenReturn(Optional.of(activeMembership(44L, 1L, ConversationType.TICKET, 12L)));

        assertThatThrownBy(() -> conversationService.removeParticipant(44L, 7L))
                .isInstanceOf(InvalidConversationRequestException.class)
                .hasMessageContaining("discussion ticket");
    }

    @Test
    void validateMembershipAllowsActiveParticipant() {
        when(conversationRepository.findById(44L)).thenReturn(Optional.of(existingConversation(44L, ConversationType.GROUP, null)));
        when(participantRepository.findActiveMembershipWithConversation(44L, 1L))
                .thenReturn(Optional.of(activeMembership(44L, 1L, ConversationType.GROUP, null)));

        conversationService.validateMembership(44L);

        verify(participantRepository).findActiveMembershipWithConversation(44L, 1L);
    }

    @Test
    void validateMembershipRejectsNonParticipant() {
        when(conversationRepository.findById(44L)).thenReturn(Optional.of(existingConversation(44L, ConversationType.GROUP, null)));
        when(participantRepository.findActiveMembershipWithConversation(44L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> conversationService.validateMembership(44L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    @Test
    void getConversationRejectsInactiveParticipant() {
        when(conversationRepository.findById(55L)).thenReturn(Optional.of(existingConversation(55L, ConversationType.GROUP, null)));
        when(participantRepository.findActiveMembershipWithConversation(55L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> conversationService.getConversation(55L))
                .isInstanceOf(ConversationAccessDeniedException.class);
    }

    private void stubConversationLoad(Long conversationId, List<Long> participantIds, long unreadCount, Message latestMessage) {
        Conversation conversation = existingConversation(conversationId, ConversationType.GROUP, null);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(participantRepository.findActiveMembershipWithConversation(conversationId, 1L))
                .thenReturn(Optional.of(activeMembership(conversationId, 1L, ConversationType.GROUP, null)));
        when(participantRepository.findByConversationIdOrderByIdAsc(conversationId))
                .thenReturn(participantIds.stream().map(userId -> activeMembership(conversationId, userId, ConversationType.GROUP, null)).toList());
        when(messageRepository.findFirstByConversationIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(conversationId))
                .thenReturn(latestMessage);
        when(messageRepository.countUnreadMessagesForConversationAndUser(conversationId, 1L)).thenReturn(unreadCount);
    }

    private Conversation existingConversation(Long id, ConversationType type, Long ticketId) {
        Conversation conversation = new Conversation();
        ReflectionTestUtils.setField(conversation, "id", id);
        ReflectionTestUtils.setField(conversation, "createdAt", LocalDateTime.now().minusHours(2));
        ReflectionTestUtils.setField(conversation, "updatedAt", LocalDateTime.now().minusHours(1));
        conversation.setType(type);
        conversation.setTicketId(ticketId);
        conversation.setCreatedByUserId(1L);
        return conversation;
    }

    private ConversationParticipant activeMembership(Long conversationId, Long userId, ConversationType type, Long ticketId) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setConversation(existingConversation(conversationId, type, ticketId));
        participant.setUserId(userId);
        participant.setActive(true);
        ReflectionTestUtils.setField(participant, "joinedAt", LocalDateTime.now().minusDays(1));
        return participant;
    }
}
