package com.cgi.intranet.messaging.service.impl;

import com.cgi.intranet.messaging.client.AuthUserClient;
import com.cgi.intranet.messaging.client.TicketClient;
import com.cgi.intranet.messaging.dto.request.CreateConversationRequest;
import com.cgi.intranet.messaging.dto.request.ParticipantRequest;
import com.cgi.intranet.messaging.dto.response.ConversationResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;
import com.cgi.intranet.messaging.entity.Conversation;
import com.cgi.intranet.messaging.entity.ConversationParticipant;
import com.cgi.intranet.messaging.entity.Message;
import com.cgi.intranet.messaging.enums.ConversationType;
import com.cgi.intranet.messaging.exception.ConversationAccessDeniedException;
import com.cgi.intranet.messaging.exception.ConversationNotFoundException;
import com.cgi.intranet.messaging.exception.DuplicateTicketConversationException;
import com.cgi.intranet.messaging.exception.InvalidConversationRequestException;
import com.cgi.intranet.messaging.repository.ConversationParticipantRepository;
import com.cgi.intranet.messaging.repository.ConversationRepository;
import com.cgi.intranet.messaging.repository.MessageRepository;
import com.cgi.intranet.messaging.service.ConversationService;
import com.cgi.intranet.messaging.service.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ConversationServiceImpl implements ConversationService {

    private static final int LAST_MESSAGE_PREVIEW_LENGTH = 140;

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final CurrentUserService currentUserService;
    private final TicketClient ticketClient;
    private final AuthUserClient authUserClient;

    public ConversationServiceImpl(
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            MessageRepository messageRepository,
            CurrentUserService currentUserService,
            TicketClient ticketClient,
            AuthUserClient authUserClient
    ) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.currentUserService = currentUserService;
        this.ticketClient = ticketClient;
        this.authUserClient = authUserClient;
    }

    @Override
    public List<ConversationResponse> listCurrentUserConversations() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        List<ConversationParticipant> memberships =
                participantRepository.findActiveMembershipsWithConversationForUser(currentUser.userId());
        if (memberships.isEmpty()) {
            return List.of();
        }

        memberships = memberships.stream()
                .filter(this::isReadableMembership)
                .toList();
        if (memberships.isEmpty()) {
            return List.of();
        }

        List<Long> conversationIds = memberships.stream()
                .map(participant -> participant.getConversation().getId())
                .toList();
        Map<Long, List<ConversationParticipant>> participantsByConversation = participantRepository
                .findByConversationIdInOrderByConversationIdAscIdAsc(conversationIds)
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        participant -> participant.getConversation().getId(),
                        LinkedHashMap::new,
                        java.util.stream.Collectors.toList()
                ));
        Map<Long, Message> latestMessages = findLatestMessagesByConversation(conversationIds);

        return memberships.stream()
                .map(membership -> toConversationResponse(
                        membership.getConversation(),
                        participantsByConversation.getOrDefault(membership.getConversation().getId(), List.of()),
                        latestMessages.get(membership.getConversation().getId()),
                        messageRepository.countUnreadMessagesForConversationAndUser(
                                membership.getConversation().getId(),
                                currentUser.userId()
                        )
                ))
                .toList();
    }

    @Override
    public ConversationResponse getConversation(Long conversationId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Conversation conversation = findConversation(conversationId);
        ensureActiveMembership(conversationId, currentUser.userId());
        ensureTicketReadableIfNeeded(conversation);

        List<ConversationParticipant> participants = participantRepository.findByConversationIdOrderByIdAsc(conversationId);
        Message latestMessage = messageRepository.findFirstByConversationIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(conversationId);
        long unreadCount = messageRepository.countUnreadMessagesForConversationAndUser(conversationId, currentUser.userId());
        return toConversationResponse(conversation, participants, latestMessage, unreadCount);
    }

    @Override
    @Transactional
    public ConversationResponse createConversation(CreateConversationRequest request) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        if (request.type() == null) {
            throw new InvalidConversationRequestException("Le type de conversation est obligatoire");
        }

        return switch (request.type()) {
            case DIRECT -> createDirectConversation(request, currentUser.userId());
            case GROUP -> createGroupConversation(request, currentUser.userId());
            case TICKET -> throw new InvalidConversationRequestException(
                    "Utilisez l'endpoint ticket pour creer une conversation de ticket"
            );
        };
    }

    @Override
    public ConversationResponse getTicketConversation(Long ticketId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ticketClient.ensureTicketReadable(ticketId);
        Conversation conversation = conversationRepository.findTicketConversationByTicketId(ticketId)
                .orElseThrow(() -> new ConversationNotFoundException(ticketId));
        ensureActiveMembership(conversation.getId(), currentUser.userId());
        return getConversation(conversation.getId());
    }

    @Override
    @Transactional
    public ConversationResponse createTicketConversation(Long ticketId, CreateConversationRequest request) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ticketClient.ensureTicketReadable(ticketId);
        if (request.type() != null && request.type() != ConversationType.TICKET) {
            throw new InvalidConversationRequestException("Le type doit etre TICKET pour une conversation de ticket");
        }
        if (conversationRepository.existsTicketConversationByTicketId(ticketId)) {
            throw new DuplicateTicketConversationException(ticketId);
        }

        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.TICKET);
        conversation.setTicketId(ticketId);
        conversation.setCreatedByUserId(currentUser.userId());
        Conversation savedConversation = conversationRepository.save(conversation);

        List<Long> participantIds = normalizeParticipantIds(request.participantUserIds(), currentUser.userId());
        createParticipants(savedConversation, participantIds);
        createInitialMessageIfPresent(savedConversation, currentUser.userId(), request.initialMessage(), request.urgent());

        return getConversation(savedConversation.getId());
    }

    @Override
    public List<ParticipantResponse> listParticipants(Long conversationId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Conversation conversation = findConversation(conversationId);
        ensureActiveMembership(conversationId, currentUser.userId());
        ensureTicketReadableIfNeeded(conversation);
        return participantRepository.findByConversationIdOrderByIdAsc(conversationId).stream()
                .map(this::toParticipantResponse)
                .toList();
    }

    @Override
    @Transactional
    public ParticipantResponse addParticipant(Long conversationId, ParticipantRequest request) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Conversation conversation = findConversation(conversationId);
        ConversationParticipant currentMembership = ensureActiveMembership(conversationId, currentUser.userId());
        ensureParticipantModificationAllowed(conversation, currentMembership, currentUser);
        Long targetUserId = request.userId();
        if (targetUserId.equals(currentUser.userId()) && currentMembership.isActive()) {
            return toParticipantResponse(currentMembership);
        }
        authUserClient.getActiveMessagingDirectoryUser(resolveBearerToken(), targetUserId);

        ConversationParticipant participant = participantRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElse(null);
        if (participant != null) {
            if (participant.isActive()) {
                return toParticipantResponse(participant);
            }
            participant.setActive(true);
            participant.setLastReadAt(null);
            ConversationParticipant reactivated = participantRepository.save(participant);
            conversation.touch();
            conversationRepository.save(conversation);
            return toParticipantResponse(reactivated);
        }

        ConversationParticipant created = new ConversationParticipant();
        created.setConversation(conversation);
        created.setUserId(targetUserId);
        created.setActive(true);
        ConversationParticipant saved = participantRepository.save(created);
        conversation.touch();
        conversationRepository.save(conversation);
        return toParticipantResponse(saved);
    }

    @Override
    @Transactional
    public ParticipantResponse removeParticipant(Long conversationId, Long userId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Conversation conversation = findConversation(conversationId);
        ConversationParticipant currentMembership = ensureActiveMembership(conversationId, currentUser.userId());
        ensureParticipantModificationAllowed(conversation, currentMembership, currentUser);

        if (Objects.equals(userId, currentUser.userId()) && Objects.equals(conversation.getCreatedByUserId(), currentUser.userId())) {
            throw new InvalidConversationRequestException("Le createur ne peut pas se retirer lui-meme du groupe");
        }

        ConversationParticipant participant = participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new InvalidConversationRequestException("Le participant est introuvable dans cette conversation"));
        if (!participant.isActive()) {
            return toParticipantResponse(participant);
        }

        participant.setActive(false);
        participant.setLastReadAt(null);
        ConversationParticipant saved = participantRepository.save(participant);
        conversation.touch();
        conversationRepository.save(conversation);
        return toParticipantResponse(saved);
    }

    @Override
    public void validateMembership(Long conversationId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Conversation conversation = findConversation(conversationId);
        ensureActiveMembership(conversationId, currentUser.userId());
        ensureTicketReadableIfNeeded(conversation);
    }

    private ConversationResponse createDirectConversation(CreateConversationRequest request, Long currentUserId) {
        List<Long> otherParticipants = normalizeOtherParticipantIds(request.participantUserIds(), currentUserId);
        if (otherParticipants.size() != 1) {
            throw new InvalidConversationRequestException(
                    "Une conversation directe doit contenir exactement un autre participant"
            );
        }

        Long otherUserId = otherParticipants.get(0);
        Conversation existing = conversationRepository.findDirectConversationForUsers(currentUserId, otherUserId).orElse(null);
        if (existing != null) {
            return getConversation(existing.getId());
        }

        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.DIRECT);
        conversation.setCreatedByUserId(currentUserId);
        Conversation savedConversation = conversationRepository.save(conversation);

        createParticipants(savedConversation, List.of(currentUserId, otherUserId));
        createInitialMessageIfPresent(savedConversation, currentUserId, request.initialMessage(), request.urgent());

        return getConversation(savedConversation.getId());
    }

    private ConversationResponse createGroupConversation(CreateConversationRequest request, Long currentUserId) {
        if (!StringUtils.hasText(request.title())) {
            throw new InvalidConversationRequestException("Le titre est obligatoire pour une conversation de groupe");
        }

        List<Long> otherParticipants = normalizeOtherParticipantIds(request.participantUserIds(), currentUserId);
        if (otherParticipants.isEmpty()) {
            throw new InvalidConversationRequestException(
                    "Une conversation de groupe doit contenir au moins un autre participant"
            );
        }

        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.GROUP);
        conversation.setTitle(clean(request.title()));
        conversation.setCreatedByUserId(currentUserId);
        Conversation savedConversation = conversationRepository.save(conversation);

        List<Long> participantIds = new ArrayList<>();
        participantIds.add(currentUserId);
        participantIds.addAll(otherParticipants);
        createParticipants(savedConversation, participantIds);
        createInitialMessageIfPresent(savedConversation, currentUserId, request.initialMessage(), request.urgent());

        return getConversation(savedConversation.getId());
    }

    private void createParticipants(Conversation conversation, List<Long> participantIds) {
        participantIds.stream()
                .distinct()
                .forEach(userId -> {
                    ConversationParticipant participant = new ConversationParticipant();
                    participant.setConversation(conversation);
                    participant.setUserId(userId);
                    participant.setActive(true);
                    participantRepository.save(participant);
                });
    }

    private void createInitialMessageIfPresent(
            Conversation conversation,
            Long senderUserId,
            String initialMessage,
            Boolean urgent
    ) {
        if (initialMessage == null) {
            return;
        }
        if (!StringUtils.hasText(initialMessage)) {
            throw new InvalidConversationRequestException("Le message initial ne peut pas etre vide");
        }

        Message message = new Message();
        message.setConversation(conversation);
        message.setSenderUserId(senderUserId);
        message.setContent(clean(initialMessage));
        message.setUrgent(Boolean.TRUE.equals(urgent));
        messageRepository.save(message);
        conversation.touch();
        conversationRepository.save(conversation);
    }

    private List<Long> normalizeParticipantIds(List<Long> participantUserIds, Long currentUserId) {
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        ids.add(currentUserId);
        if (participantUserIds != null) {
            participantUserIds.stream()
                    .filter(Objects::nonNull)
                    .forEach(ids::add);
        }
        return new ArrayList<>(ids);
    }

    private List<Long> normalizeOtherParticipantIds(List<Long> participantUserIds, Long currentUserId) {
        return normalizeParticipantIds(participantUserIds, currentUserId).stream()
                .filter(userId -> !Objects.equals(userId, currentUserId))
                .toList();
    }

    private Conversation findConversation(Long conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));
    }

    private ConversationParticipant ensureActiveMembership(Long conversationId, Long userId) {
        return participantRepository.findActiveMembershipWithConversation(conversationId, userId)
                .orElseThrow(ConversationAccessDeniedException::new);
    }

    private void ensureParticipantModificationAllowed(
            Conversation conversation,
            ConversationParticipant currentMembership,
            CurrentUserService.CurrentUser currentUser
    ) {
        if (conversation.getType() == ConversationType.DIRECT) {
            throw new InvalidConversationRequestException("Les participants d'une conversation directe ne peuvent pas etre modifies");
        }
        if (conversation.getType() == ConversationType.TICKET) {
            throw new InvalidConversationRequestException("Les participants d'une discussion ticket ne peuvent pas etre modifies dans cette version");
        }
        boolean managerOrAdmin = currentUser.admin() || currentUser.manager();
        boolean creator = Objects.equals(conversation.getCreatedByUserId(), currentUser.userId());
        if (!currentMembership.isActive() || (!managerOrAdmin && !creator)) {
            throw new ConversationAccessDeniedException();
        }
    }

    private void ensureTicketReadableIfNeeded(Conversation conversation) {
        if (conversation.getType() == ConversationType.TICKET && conversation.getTicketId() != null) {
            ticketClient.ensureTicketReadable(conversation.getTicketId());
        }
    }

    private boolean isReadableMembership(ConversationParticipant membership) {
        Conversation conversation = membership.getConversation();
        if (conversation.getType() != ConversationType.TICKET || conversation.getTicketId() == null) {
            return true;
        }
        try {
            ticketClient.ensureTicketReadable(conversation.getTicketId());
            return true;
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode() == HttpStatus.FORBIDDEN || exception.getStatusCode() == HttpStatus.NOT_FOUND) {
                return false;
            }
            throw exception;
        }
    }

    private String resolveBearerToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthenticationToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return "Bearer " + jwtAuthenticationToken.getToken().getTokenValue();
    }

    private ConversationResponse toConversationResponse(
            Conversation conversation,
            List<ConversationParticipant> participants,
            Message latestMessage,
            long unreadCount
    ) {
        return new ConversationResponse(
                conversation.getId(),
                conversation.getType(),
                conversation.getTitle(),
                conversation.getTicketId(),
                conversation.getCreatedByUserId(),
                conversation.getCreatedAt(),
                conversation.getUpdatedAt(),
                participants.stream().map(this::toParticipantResponse).toList(),
                latestMessage == null ? null : preview(latestMessage.getContent()),
                latestMessage == null ? null : latestMessage.getCreatedAt(),
                latestMessage == null ? null : latestMessage.isUrgent(),
                unreadCount
        );
    }

    private ParticipantResponse toParticipantResponse(ConversationParticipant participant) {
        return new ParticipantResponse(
                participant.getUserId(),
                participant.getJoinedAt(),
                participant.isActive(),
                participant.getLastReadAt()
        );
    }

    private Map<Long, Message> findLatestMessagesByConversation(List<Long> conversationIds) {
        if (conversationIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Message> latestMessages = new LinkedHashMap<>();
        for (Message message : messageRepository
                .findByConversationIdInAndDeletedAtIsNullOrderByConversationIdAscCreatedAtDescIdDesc(conversationIds)) {
            latestMessages.putIfAbsent(message.getConversation().getId(), message);
        }
        return latestMessages;
    }

    private String preview(String content) {
        if (content == null || content.length() <= LAST_MESSAGE_PREVIEW_LENGTH) {
            return content;
        }
        return content.substring(0, LAST_MESSAGE_PREVIEW_LENGTH - 3) + "...";
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
