package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.dto.request.TicketCreateRequest;
import com.cgi.intranet.ticket.dto.request.TicketUpdateRequest;
import com.cgi.intranet.ticket.dto.response.TicketDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.TicketHistoryResponse;
import com.cgi.intranet.ticket.dto.response.TicketPriorityDistributionResponse;
import com.cgi.intranet.ticket.dto.response.TicketResponse;
import com.cgi.intranet.ticket.dto.response.TicketStatusDistributionResponse;
import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketHistoryActionType;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.exception.TicketNotFoundException;
import com.cgi.intranet.ticket.mapper.TicketMapper;
import com.cgi.intranet.ticket.repository.TicketRepository;
import com.cgi.intranet.ticket.service.CurrentUserService;
import com.cgi.intranet.ticket.service.NotificationService;
import com.cgi.intranet.ticket.service.SlaService;
import com.cgi.intranet.ticket.service.TicketAuthorizationService;
import com.cgi.intranet.ticket.service.TicketHistoryService;
import com.cgi.intranet.ticket.service.TicketService;
import com.cgi.intranet.ticket.util.TicketLabelResolver;
import com.cgi.intranet.ticket.util.TicketReferenceGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class TicketServiceImpl implements TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketServiceImpl.class);

    private final TicketRepository ticketRepository;
    private final TicketMapper ticketMapper;
    private final TicketReferenceGenerator ticketReferenceGenerator;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final TicketHistoryService ticketHistoryService;
    private final TicketAuthorizationService ticketAuthorizationService;
    private final SlaService slaService;

    public TicketServiceImpl(
            TicketRepository ticketRepository,
            TicketMapper ticketMapper,
            TicketReferenceGenerator ticketReferenceGenerator,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            TicketHistoryService ticketHistoryService,
            TicketAuthorizationService ticketAuthorizationService,
            SlaService slaService
    ) {
        this.ticketRepository = ticketRepository;
        this.ticketMapper = ticketMapper;
        this.ticketReferenceGenerator = ticketReferenceGenerator;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.ticketHistoryService = ticketHistoryService;
        this.ticketAuthorizationService = ticketAuthorizationService;
        this.slaService = slaService;
    }

    @Override
    public List<TicketResponse> getTicketsForCurrentUser() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();

        if (currentUser.admin()) {
            return ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc().stream()
                    .map(ticketMapper::toResponse)
                    .toList();
        }
        if (currentUser.manager()) {
            // TODO: scope manager ticket visibility by department/team once those ownership rules are defined.
            return ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc().stream()
                    .map(ticketMapper::toResponse)
                    .toList();
        }

        Map<Long, Ticket> visibleTickets = new LinkedHashMap<>();
        ticketRepository.findByRequesterIdAndDeletedFalseOrderByCreatedAtDesc(currentUser.userId())
                .forEach(ticket -> visibleTickets.put(ticket.getId(), ticket));
        ticketRepository.findByAssignedUserIdAndDeletedFalseOrderByCreatedAtDesc(currentUser.userId())
                .forEach(ticket -> visibleTickets.put(ticket.getId(), ticket));

        return visibleTickets.values().stream()
                .map(ticketMapper::toResponse)
                .toList();
    }

    @Override
    public TicketResponse getTicketById(Long id) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Ticket ticket = findTicket(id);
        ticketAuthorizationService.ensureReadable(ticket, currentUser);
        return ticketMapper.toResponse(ticket);
    }

    @Override
    public List<TicketHistoryResponse> getTicketHistory(Long id) {
        return ticketHistoryService.getTicketHistory(id);
    }

    @Override
    public TicketDashboardSummaryResponse getDashboardSummary() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ensureDashboardReadable(currentUser);

        List<Ticket> tickets = ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();

        long totalTickets = tickets.size();
        long resolvedTickets = countByStatus(tickets, TicketStatus.RESOLVED);
        long closedTickets = countByStatus(tickets, TicketStatus.CLOSED);
        long cancelledTickets = countByStatus(tickets, TicketStatus.CANCELLED);
        long todoTickets = tickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.NEW || ticket.getStatus() == TicketStatus.TODO)
                .count();
        long assignedTickets = countByStatus(tickets, TicketStatus.ASSIGNED);
        long inProgressTickets = countByStatus(tickets, TicketStatus.IN_PROGRESS);
        long waitingTickets = tickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.WAITING_REQUESTER
                        || ticket.getStatus() == TicketStatus.WAITING_PROVIDER
                        || ticket.getStatus() == TicketStatus.WAITING_MANAGER_VALIDATION)
                .count();
        long openTickets = tickets.stream()
                .filter(ticket -> ticket.getStatus() != TicketStatus.RESOLVED
                        && ticket.getStatus() != TicketStatus.CLOSED
                        && ticket.getStatus() != TicketStatus.CANCELLED)
                .count();
        long createdToday = tickets.stream()
                .filter(ticket -> !ticket.getCreatedAt().isBefore(startOfDay))
                .count();
        long resolvedToday = tickets.stream()
                .filter(ticket -> ticket.getResolvedAt() != null && !ticket.getResolvedAt().isBefore(startOfDay))
                .count();
        long closedToday = tickets.stream()
                .filter(ticket -> ticket.getClosedAt() != null && !ticket.getClosedAt().isBefore(startOfDay))
                .count();

        Double averageTreatmentMinutes = tickets.stream()
                .map(ticket -> {
                    LocalDateTime effectiveEnd = ticket.getClosedAt() != null ? ticket.getClosedAt() : ticket.getResolvedAt();
                    if (effectiveEnd == null) {
                        return null;
                    }
                    return Math.max(0L, java.time.Duration.between(ticket.getCreatedAt(), effectiveEnd).toMinutes());
                })
                .filter(duration -> duration != null && duration >= 0)
                .mapToLong(Long::longValue)
                .average()
                .stream()
                .boxed()
                .findFirst()
                .orElse(null);

        return new TicketDashboardSummaryResponse(
                totalTickets,
                openTickets,
                todoTickets,
                assignedTickets,
                inProgressTickets,
                waitingTickets,
                resolvedTickets,
                closedTickets,
                cancelledTickets,
                createdToday,
                resolvedToday,
                closedToday,
                averageTreatmentMinutes,
                now
        );
    }

    @Override
    public List<TicketStatusDistributionResponse> getStatusDistribution() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ensureDashboardReadable(currentUser);

        Map<TicketStatus, Long> counts = new EnumMap<>(TicketStatus.class);
        ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc()
                .forEach(ticket -> counts.merge(ticket.getStatus(), 1L, Long::sum));

        return java.util.Arrays.stream(TicketStatus.values())
                .map(status -> new TicketStatusDistributionResponse(
                        status,
                        TicketLabelResolver.statusLabel(status),
                        counts.getOrDefault(status, 0L)
                ))
                .toList();
    }

    @Override
    public List<TicketPriorityDistributionResponse> getPriorityDistribution() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        ensureDashboardReadable(currentUser);

        Map<TicketPriority, Long> counts = new EnumMap<>(TicketPriority.class);
        ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc()
                .forEach(ticket -> counts.merge(ticket.getPriority(), 1L, Long::sum));

        return java.util.Arrays.stream(TicketPriority.values())
                .map(priority -> new TicketPriorityDistributionResponse(
                        priority,
                        TicketLabelResolver.priorityLabel(priority),
                        counts.getOrDefault(priority, 0L)
                ))
                .toList();
    }

    @Override
    @Transactional
    public TicketResponse createTicket(TicketCreateRequest request) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Ticket ticket = ticketMapper.toEntity(request);
        ticket.setReference(ticketReferenceGenerator.nextReference());
        ticket.setStatus(TicketStatus.NEW);
        ticket.setRequesterId(currentUser.userId());
        Ticket savedTicket = ticketRepository.save(ticket);
        ticketHistoryService.recordEvent(
                savedTicket,
                TicketHistoryActionType.CREATED,
                null,
                buildTicketSnapshot(savedTicket),
                "Ticket créé",
                currentUser.userId()
        );
        try {
            slaService.applySlaToTicket(savedTicket, currentUser.userId());
            ticketHistoryService.recordEvent(
                    savedTicket,
                    TicketHistoryActionType.SLA_STARTED,
                    null,
                    savedTicket.getReference(),
                    "SLA démarré",
                    currentUser.userId()
            );
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.warn("L'application du SLA a échoué pour le ticket {}", savedTicket.getId(), exception);
        }
        return ticketMapper.toResponse(savedTicket);
    }

    @Override
    @Transactional
    public TicketResponse updateTicket(Long id, TicketUpdateRequest request) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Ticket ticket = findTicket(id);
        ticketAuthorizationService.ensureUpdatable(ticket, currentUser);

        String oldTitle = ticket.getTitle();
        String oldDescription = ticket.getDescription();
        String oldCategory = ticket.getCategory();
        String oldSubCategory = ticket.getSubCategory();
        TicketStatus oldStatus = ticket.getStatus();
        TicketPriority oldPriority = ticket.getPriority();
        TicketCriticality oldCriticality = ticket.getCriticality();
        Long oldAssignedUserId = ticket.getAssignedUserId();
        Long oldAssignedTeamId = ticket.getAssignedTeamId();
        Long oldDepartmentId = ticket.getDepartmentId();
        String beforeSnapshot = buildTicketSnapshot(ticket);

        ticketMapper.updateEntity(ticket, request);
        applyDerivedTimestamps(ticket, oldStatus, oldAssignedUserId);

        Ticket savedTicket = ticketRepository.save(ticket);
        notifyAssignedUserIfChanged(savedTicket, oldAssignedUserId);
        notifyAssignedUserOnStatusChange(savedTicket, oldStatus, currentUser.userId());
        updateSlaAfterTicketChange(savedTicket, currentUser.userId());

        String afterSnapshot = buildTicketSnapshot(savedTicket);
        if (!beforeSnapshot.equals(afterSnapshot)) {
            ticketHistoryService.recordEvent(
                    savedTicket,
                    TicketHistoryActionType.UPDATED,
                    beforeSnapshot,
                    afterSnapshot,
                    buildUpdateComment(
                            oldTitle,
                            oldDescription,
                            oldCategory,
                            oldSubCategory,
                            oldStatus,
                            oldPriority,
                            oldCriticality,
                            oldAssignedUserId,
                            oldAssignedTeamId,
                            oldDepartmentId,
                            savedTicket
                    ),
                    currentUser.userId()
            );
        }

        recordSpecificChangeEvents(savedTicket, currentUser.userId(), oldStatus, oldPriority, oldCriticality, oldAssignedUserId);
        return ticketMapper.toResponse(savedTicket);
    }

    @Override
    @Transactional
    public void deleteTicket(Long id) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        if (!currentUser.admin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seuls les administrateurs peuvent supprimer un ticket");
        }

        Ticket ticket = findTicket(id);
        ticket.setDeleted(true);
        ticket.setDeletedAt(LocalDateTime.now());
        ticketRepository.save(ticket);
    }

    private Ticket findTicket(Long id) {
        return ticketRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    private void ensureDashboardReadable(CurrentUserService.CurrentUser currentUser) {
        if (currentUser.admin() || currentUser.manager()) {
            // TODO: keep manager visibility aligned with current global ticket visibility until manager scoping rules are defined.
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au tableau de bord tickets");
    }

    private long countByStatus(List<Ticket> tickets, TicketStatus status) {
        return tickets.stream()
                .filter(ticket -> ticket.getStatus() == status)
                .count();
    }

    private void recordSpecificChangeEvents(
            Ticket ticket,
            Long performedBy,
            TicketStatus oldStatus,
            TicketPriority oldPriority,
            TicketCriticality oldCriticality,
            Long oldAssignedUserId
    ) {
        if (oldPriority != ticket.getPriority()) {
            ticketHistoryService.recordEvent(
                    ticket,
                    TicketHistoryActionType.PRIORITY_CHANGED,
                    stringify(oldPriority),
                    stringify(ticket.getPriority()),
                    "Ticket priority changed",
                    performedBy
            );
        }
        if (oldCriticality != ticket.getCriticality()) {
            ticketHistoryService.recordEvent(
                    ticket,
                    TicketHistoryActionType.CRITICALITY_CHANGED,
                    stringify(oldCriticality),
                    stringify(ticket.getCriticality()),
                    "Ticket criticality changed",
                    performedBy
            );
        }
        if (oldAssignedUserId == null && ticket.getAssignedUserId() != null) {
            ticketHistoryService.recordEvent(
                    ticket,
                    TicketHistoryActionType.ASSIGNED,
                    null,
                    stringify(ticket.getAssignedUserId()),
                    "Ticket assigned to support user",
                    performedBy
            );
        } else if (oldAssignedUserId != null && !oldAssignedUserId.equals(ticket.getAssignedUserId())) {
            ticketHistoryService.recordEvent(
                    ticket,
                    TicketHistoryActionType.REASSIGNED,
                    stringify(oldAssignedUserId),
                    stringify(ticket.getAssignedUserId()),
                    "Ticket reassigned",
                    performedBy
            );
        }
        if (oldStatus != ticket.getStatus()) {
            ticketHistoryService.recordEvent(
                    ticket,
                    resolveStatusAction(ticket.getStatus()),
                    stringify(oldStatus),
                    stringify(ticket.getStatus()),
                    "Ticket status changed",
                    performedBy
            );
        }
    }

    private void applyDerivedTimestamps(Ticket ticket, TicketStatus oldStatus, Long oldAssignedUserId) {
        if (oldAssignedUserId == null && ticket.getAssignedUserId() != null && ticket.getAssignedAt() == null) {
            ticket.setAssignedAt(LocalDateTime.now());
        }
        if (oldStatus != ticket.getStatus()) {
            LocalDateTime now = LocalDateTime.now();
            if (ticket.getStatus() == TicketStatus.IN_PROGRESS && ticket.getStartedAt() == null) {
                ticket.setStartedAt(now);
            }
            if (ticket.getStatus() == TicketStatus.RESOLVED) {
                ticket.setResolvedAt(now);
            }
            if (ticket.getStatus() == TicketStatus.CLOSED) {
                ticket.setClosedAt(now);
            }
        }
    }

    private TicketHistoryActionType resolveStatusAction(TicketStatus status) {
        return switch (status) {
            case RESOLVED -> TicketHistoryActionType.RESOLVED;
            case CLOSED -> TicketHistoryActionType.CLOSED;
            case REOPENED -> TicketHistoryActionType.REOPENED;
            case CANCELLED -> TicketHistoryActionType.CANCELLED;
            default -> TicketHistoryActionType.STATUS_CHANGED;
        };
    }

    private String buildUpdateComment(
            String oldTitle,
            String oldDescription,
            String oldCategory,
            String oldSubCategory,
            TicketStatus oldStatus,
            TicketPriority oldPriority,
            TicketCriticality oldCriticality,
            Long oldAssignedUserId,
            Long oldAssignedTeamId,
            Long oldDepartmentId,
            Ticket ticket
    ) {
        List<String> changedFields = new java.util.ArrayList<>();
        if (!java.util.Objects.equals(oldTitle, ticket.getTitle())) {
            changedFields.add("title");
        }
        if (!java.util.Objects.equals(oldDescription, ticket.getDescription())) {
            changedFields.add("description");
        }
        if (!java.util.Objects.equals(oldCategory, ticket.getCategory())) {
            changedFields.add("category");
        }
        if (!java.util.Objects.equals(oldSubCategory, ticket.getSubCategory())) {
            changedFields.add("subCategory");
        }
        if (oldStatus != ticket.getStatus()) {
            changedFields.add("status");
        }
        if (oldPriority != ticket.getPriority()) {
            changedFields.add("priority");
        }
        if (oldCriticality != ticket.getCriticality()) {
            changedFields.add("criticality");
        }
        if (!java.util.Objects.equals(oldAssignedUserId, ticket.getAssignedUserId())) {
            changedFields.add("assignedUserId");
        }
        if (!java.util.Objects.equals(oldAssignedTeamId, ticket.getAssignedTeamId())) {
            changedFields.add("assignedTeamId");
        }
        if (!java.util.Objects.equals(oldDepartmentId, ticket.getDepartmentId())) {
            changedFields.add("departmentId");
        }
        return changedFields.isEmpty()
                ? "Ticket updated"
                : "Updated fields: " + String.join(", ", changedFields);
    }

    private String buildTicketSnapshot(Ticket ticket) {
        return "title=" + stringify(ticket.getTitle())
                + "; description=" + stringify(ticket.getDescription())
                + "; status=" + stringify(ticket.getStatus())
                + "; type=" + stringify(ticket.getType())
                + "; category=" + stringify(ticket.getCategory())
                + "; subCategory=" + stringify(ticket.getSubCategory())
                + "; priority=" + stringify(ticket.getPriority())
                + "; criticality=" + stringify(ticket.getCriticality())
                + "; requesterId=" + stringify(ticket.getRequesterId())
                + "; assignedUserId=" + stringify(ticket.getAssignedUserId())
                + "; assignedTeamId=" + stringify(ticket.getAssignedTeamId())
                + "; departmentId=" + stringify(ticket.getDepartmentId());
    }

    private String stringify(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private void notifyAssignedUserIfChanged(Ticket ticket, Long oldAssignedUserId) {
        Long newAssignedUserId = ticket.getAssignedUserId();
        if (newAssignedUserId == null || java.util.Objects.equals(oldAssignedUserId, newAssignedUserId)) {
            return;
        }

        if (oldAssignedUserId == null) {
            notificationService.createNotificationIfAbsent(
                    newAssignedUserId,
                    ticket.getId(),
                    NotificationType.TICKET_ASSIGNED,
                    "Ticket affecte",
                    "Le ticket " + ticket.getReference() + " vous a ete affecte."
            );
            return;
        }

        notificationService.createNotificationIfAbsent(
                newAssignedUserId,
                ticket.getId(),
                NotificationType.TICKET_REASSIGNED,
                "Ticket reaffecte",
                "Le ticket " + ticket.getReference() + " vous a ete reassigne."
        );
    }

    private void notifyAssignedUserOnStatusChange(Ticket ticket, TicketStatus oldStatus, Long currentUserId) {
        if (oldStatus == ticket.getStatus()) {
            return;
        }

        Long assignedUserId = ticket.getAssignedUserId();
        if (assignedUserId == null || java.util.Objects.equals(assignedUserId, currentUserId)) {
            return;
        }

        notificationService.createNotificationIfAbsent(
                assignedUserId,
                ticket.getId(),
                NotificationType.TICKET_STATUS_UPDATED,
                "Statut du ticket mis a jour",
                "Le statut du ticket " + ticket.getReference() + " est passe a " + TicketLabelResolver.statusLabel(ticket.getStatus()) + "."
        );
    }

    private void updateSlaAfterTicketChange(Ticket ticket, Long performedBy) {
        try {
            com.cgi.intranet.ticket.dto.response.TicketSlaResponse ticketSla = slaService.synchronizeTicketSla(ticket, performedBy);
            if (ticketSla.globalStatus() == null) {
                return;
            }

            TicketHistoryActionType actionType = switch (ticketSla.globalStatus()) {
                case AT_RISK -> TicketHistoryActionType.SLA_AT_RISK;
                case BREACHED -> TicketHistoryActionType.SLA_BREACHED;
                case RESPECTED -> TicketHistoryActionType.SLA_RESPECTED;
                case NOT_APPLICABLE -> TicketHistoryActionType.SLA_NOT_APPLICABLE;
                case PAUSED -> null;
            };

            if (actionType != null) {
                ticketHistoryService.recordEvent(
                        ticket,
                        actionType,
                        null,
                        ticketSla.globalStatus().name(),
                        ticketSla.globalStatusLabel(),
                        performedBy
                );
            }
        } catch (RuntimeException exception) {
            log.warn("La synchronisation SLA a échoué pour le ticket {}", ticket.getId(), exception);
        }
    }
}
