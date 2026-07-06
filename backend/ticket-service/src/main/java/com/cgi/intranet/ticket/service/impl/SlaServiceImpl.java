package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.dto.request.SlaPolicyCreateRequest;
import com.cgi.intranet.ticket.dto.request.SlaPolicyStatusUpdateRequest;
import com.cgi.intranet.ticket.dto.request.SlaPolicyUpdateRequest;
import com.cgi.intranet.ticket.dto.response.SlaDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.SlaPolicyResponse;
import com.cgi.intranet.ticket.dto.response.SlaUrgentTicketResponse;
import com.cgi.intranet.ticket.dto.response.TicketSlaResponse;
import com.cgi.intranet.ticket.entity.SlaPolicy;
import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.entity.TicketSla;
import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.enums.SlaStatus;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketHistoryActionType;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.repository.SlaPolicyRepository;
import com.cgi.intranet.ticket.repository.TicketRepository;
import com.cgi.intranet.ticket.repository.TicketSlaRepository;
import com.cgi.intranet.ticket.service.CurrentUserService;
import com.cgi.intranet.ticket.service.NotificationService;
import com.cgi.intranet.ticket.service.SlaRecipientDirectoryService;
import com.cgi.intranet.ticket.service.SlaService;
import com.cgi.intranet.ticket.service.TicketAuthorizationService;
import com.cgi.intranet.ticket.service.TicketHistoryService;
import com.cgi.intranet.ticket.util.TicketLabelResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SlaServiceImpl implements SlaService {

    private static final Set<TicketStatus> PAUSED_STATUSES = Set.of(
            TicketStatus.WAITING_REQUESTER,
            TicketStatus.WAITING_PROVIDER,
            TicketStatus.WAITING_MANAGER_VALIDATION
    );
    private static final long SYSTEM_USER_ID = 0L;
    private static final Duration LEVEL_TWO_ESCALATION_DELAY = Duration.ofMinutes(30);

    private final SlaPolicyRepository slaPolicyRepository;
    private final TicketSlaRepository ticketSlaRepository;
    private final TicketRepository ticketRepository;
    private final CurrentUserService currentUserService;
    private final TicketAuthorizationService ticketAuthorizationService;
    private final NotificationService notificationService;
    private final TicketHistoryService ticketHistoryService;
    private final SlaRecipientDirectoryService slaRecipientDirectoryService;

    public SlaServiceImpl(
            SlaPolicyRepository slaPolicyRepository,
            TicketSlaRepository ticketSlaRepository,
            TicketRepository ticketRepository,
            CurrentUserService currentUserService,
            TicketAuthorizationService ticketAuthorizationService,
            NotificationService notificationService,
            TicketHistoryService ticketHistoryService,
            SlaRecipientDirectoryService slaRecipientDirectoryService
    ) {
        this.slaPolicyRepository = slaPolicyRepository;
        this.ticketSlaRepository = ticketSlaRepository;
        this.ticketRepository = ticketRepository;
        this.currentUserService = currentUserService;
        this.ticketAuthorizationService = ticketAuthorizationService;
        this.notificationService = notificationService;
        this.ticketHistoryService = ticketHistoryService;
        this.slaRecipientDirectoryService = slaRecipientDirectoryService;
    }

    @Override
    public List<SlaPolicyResponse> getPolicies() {
        return slaPolicyRepository.findAllByOrderByActiveDescNameAsc().stream()
                .map(this::toPolicyResponse)
                .toList();
    }

    @Override
    public SlaPolicyResponse getPolicyById(Long id) {
        return toPolicyResponse(findPolicy(id));
    }

    @Override
    @Transactional
    public SlaPolicyResponse createPolicy(SlaPolicyCreateRequest request) {
        SlaPolicy policy = new SlaPolicy();
        applyPolicyValues(policy, request.name(), request.incidentType(), request.priority(), request.criticality(),
                request.responseTimeMinutes(), request.resolutionTimeMinutes(), request.warningThresholdPercent());
        policy.setActive(true);
        return toPolicyResponse(slaPolicyRepository.save(policy));
    }

    @Override
    @Transactional
    public SlaPolicyResponse updatePolicy(Long id, SlaPolicyUpdateRequest request) {
        SlaPolicy policy = findPolicy(id);
        applyPolicyValues(policy, request.name(), request.incidentType(), request.priority(), request.criticality(),
                request.responseTimeMinutes(), request.resolutionTimeMinutes(), request.warningThresholdPercent());
        return toPolicyResponse(slaPolicyRepository.save(policy));
    }

    @Override
    @Transactional
    public SlaPolicyResponse updatePolicyStatus(Long id, SlaPolicyStatusUpdateRequest request) {
        SlaPolicy policy = findPolicy(id);
        policy.setActive(Boolean.TRUE.equals(request.active()));
        return toPolicyResponse(slaPolicyRepository.save(policy));
    }

    @Override
    public TicketSlaResponse getTicketSla(Long ticketId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Ticket ticket = findTicket(ticketId);
        ticketAuthorizationService.ensureReadable(ticket, currentUser);

        TicketSla ticketSla = ticketSlaRepository.findByTicketId(ticketId)
                .orElseGet(() -> buildNotApplicableTicketSla(ticket));
        return toTicketSlaResponse(ticketSla, resolvePolicyName(ticketSla.getPolicyId()));
    }

    @Override
    @Transactional
    public TicketSlaResponse recalculateTicketSla(Long ticketId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Ticket ticket = findTicket(ticketId);
        ticketAuthorizationService.ensureReadable(ticket, currentUser);
        TicketSla ticketSla = upsertTicketSla(ticket, currentUser.userId());
        return toTicketSlaResponse(ticketSla, resolvePolicyName(ticketSla.getPolicyId()));
    }

    @Override
    @Transactional
    public SlaDashboardSummaryResponse getDashboardSummary() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        if (!currentUser.admin() && !currentUser.manager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au tableau de bord SLA");
        }

        Map<Long, Ticket> trackedTickets = synchronizeTrackedTickets();
        List<TicketSla> trackedSlaRows = ticketSlaRepository.findAll();

        long totalTrackedTickets = trackedSlaRows.size();
        long respectedTickets = countByStatus(trackedSlaRows, SlaStatus.RESPECTED);
        long atRiskTickets = countByStatus(trackedSlaRows, SlaStatus.AT_RISK);
        long breachedTickets = countByStatus(trackedSlaRows, SlaStatus.BREACHED);
        long pausedTickets = countByStatus(trackedSlaRows, SlaStatus.PAUSED);
        long notApplicableTickets = countByStatus(trackedSlaRows, SlaStatus.NOT_APPLICABLE);

        long criticalBreachedTickets = trackedSlaRows.stream()
                .filter(ticketSla -> ticketSla.getGlobalStatus() == SlaStatus.BREACHED)
                .map(ticketSla -> trackedTickets.get(ticketSla.getTicketId()))
                .filter(ticket -> ticket != null
                        && (ticket.getCriticality() == TicketCriticality.CRITICAL
                        || ticket.getCriticality() == TicketCriticality.HIGH))
                .count();

        Double averageResolutionMinutes = averageResolutionMinutes(trackedSlaRows, trackedTickets);
        Double averageResponseMinutes = averageResponseMinutes(trackedSlaRows, trackedTickets);
        Double slaComplianceRate = computeComplianceRate(trackedSlaRows, trackedTickets);

        return new SlaDashboardSummaryResponse(
                totalTrackedTickets,
                respectedTickets,
                atRiskTickets,
                breachedTickets,
                pausedTickets,
                notApplicableTickets,
                criticalBreachedTickets,
                averageResolutionMinutes,
                averageResponseMinutes,
                slaComplianceRate,
                LocalDateTime.now()
        );
    }

    @Override
    @Transactional
    public List<SlaUrgentTicketResponse> getUrgentTickets(int limit) {
        int effectiveLimit = Math.max(1, limit);
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();

        List<TicketSla> trackedRows;
        Map<Long, Ticket> ticketById;

        if (currentUser.admin() || currentUser.manager()) {
            ticketById = synchronizeTrackedTickets();
            trackedRows = ticketSlaRepository.findAllByGlobalStatusIn(List.of(SlaStatus.BREACHED, SlaStatus.AT_RISK));
        } else if (currentUser.employee()) {
            ticketById = findEmployeeVisibleTickets(currentUser.userId()).stream()
                    .collect(Collectors.toMap(Ticket::getId, ticket -> ticket));
            if (ticketById.isEmpty()) {
                return List.of();
            }
            synchronizeTickets(ticketById.values());
            trackedRows = ticketSlaRepository.findAllByTicketIdIn(ticketById.keySet()).stream()
                    .filter(ticketSla -> ticketSla.getGlobalStatus() == SlaStatus.BREACHED
                            || ticketSla.getGlobalStatus() == SlaStatus.AT_RISK)
                    .toList();
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé aux tickets urgents SLA");
        }

        return trackedRows.stream()
                .map(ticketSla -> toUrgentTicketResponse(ticketById.get(ticketSla.getTicketId()), ticketSla))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .sorted(urgentTicketComparator())
                .limit(effectiveLimit)
                .toList();
    }

    @Override
    @Transactional
    public TicketSlaResponse applySlaToTicket(Ticket ticket, Long performedBy) {
        TicketSla ticketSla = upsertTicketSla(ticket, performedBy);
        return toTicketSlaResponse(ticketSla, resolvePolicyName(ticketSla.getPolicyId()));
    }

    @Override
    @Transactional
    public TicketSlaResponse synchronizeTicketSla(Ticket ticket, Long performedBy) {
        TicketSla ticketSla = upsertTicketSla(ticket, performedBy);
        return toTicketSlaResponse(ticketSla, resolvePolicyName(ticketSla.getPolicyId()));
    }

    private TicketSla upsertTicketSla(Ticket ticket, Long performedBy) {
        Optional<SlaPolicy> matchingPolicy = slaPolicyRepository.findFirstByActiveTrueAndIncidentTypeAndPriorityAndCriticality(
                ticket.getType(),
                ticket.getPriority(),
                ticket.getCriticality()
        );

        TicketSla ticketSla = ticketSlaRepository.findByTicketId(ticket.getId())
                .orElseGet(() -> {
                    TicketSla created = new TicketSla();
                    created.setTicketId(ticket.getId());
                    created.setEscalationLevel(0);
                    return created;
                });

        SlaStatus previousGlobalStatus = ticketSla.getGlobalStatus();
        int previousEscalationLevel = defaultEscalationLevel(ticketSla.getEscalationLevel());
        LocalDateTime previousEscalationAt = ticketSla.getLastEscalationAt();

        LocalDateTime calculatedAt = LocalDateTime.now();
        ticketSla.setLastCalculatedAt(calculatedAt);
        ticketSla.setFirstResponseAt(resolveFirstResponseAt(ticket, ticketSla.getFirstResponseAt()));
        ticketSla.setResolvedAt(resolveResolutionAt(ticket));

        if (matchingPolicy.isEmpty()) {
            applyNotApplicable(ticketSla, calculatedAt);
            TicketSla saved = ticketSlaRepository.save(ticketSla);
            handleSlaTransitions(ticket, saved, previousGlobalStatus, previousEscalationLevel, previousEscalationAt, performedBy);
            return saved;
        }

        SlaPolicy policy = matchingPolicy.get();
        ticketSla.setPolicyId(policy.getId());
        ticketSla.setResponseDeadline(ticket.getCreatedAt().plusMinutes(policy.getResponseTimeMinutes()));
        ticketSla.setResolutionDeadline(ticket.getCreatedAt().plusMinutes(policy.getResolutionTimeMinutes()));

        LocalDateTime effectiveEnd = resolveEffectiveEnd(ticket, calculatedAt);
        long elapsedMinutes = minutesBetween(ticket.getCreatedAt(), effectiveEnd);
        long remainingMinutes = Duration.between(calculatedAt, ticketSla.getResolutionDeadline()).toMinutes();
        double consumedPercentage = percentage(elapsedMinutes, policy.getResolutionTimeMinutes());

        ticketSla.setElapsedMinutes(elapsedMinutes);
        ticketSla.setRemainingMinutes(remainingMinutes);
        ticketSla.setConsumedPercentage(consumedPercentage);

        SlaStatus responseStatus = computeResponseStatus(ticket, ticketSla, policy, calculatedAt);
        SlaStatus resolutionStatus = computeResolutionStatus(ticket, ticketSla, policy, calculatedAt, consumedPercentage);
        SlaStatus globalStatus = computeGlobalStatus(ticket, ticketSla, policy, calculatedAt, consumedPercentage);

        ticketSla.setResponseStatus(responseStatus);
        ticketSla.setResolutionStatus(resolutionStatus);
        ticketSla.setGlobalStatus(globalStatus);
        ticketSla.setBreachReason(resolveBreachReason(ticket, ticketSla, globalStatus, resolutionStatus, responseStatus));

        if (globalStatus != SlaStatus.BREACHED) {
            ticketSla.setEscalationLevel(0);
            ticketSla.setLastEscalationAt(null);
        }

        TicketSla saved = ticketSlaRepository.save(ticketSla);
        handleSlaTransitions(ticket, saved, previousGlobalStatus, previousEscalationLevel, previousEscalationAt, performedBy);
        return saved;
    }

    private void handleSlaTransitions(
            Ticket ticket,
            TicketSla ticketSla,
            SlaStatus previousGlobalStatus,
            int previousEscalationLevel,
            LocalDateTime previousEscalationAt,
            Long performedBy
    ) {
        Long actorId = performedBy == null ? SYSTEM_USER_ID : performedBy;
        LocalDateTime now = LocalDateTime.now();
        boolean updated = false;

        if (ticketSla.getGlobalStatus() == SlaStatus.AT_RISK && previousGlobalStatus != SlaStatus.AT_RISK) {
            if (ticket.getAssignedUserId() != null) {
                notificationService.createNotificationIfAbsent(
                        ticket.getAssignedUserId(),
                        ticket.getId(),
                        NotificationType.SLA_AT_RISK,
                        "SLA en risque",
                        "Le ticket " + ticket.getReference() + " approche son échéance SLA."
                );
                ticketSla.setLastAlertAt(now);
                updated = true;
            }
            ticketHistoryService.recordEvent(
                    ticket,
                    TicketHistoryActionType.SLA_AT_RISK,
                    previousGlobalStatus == null ? null : previousGlobalStatus.name(),
                    ticketSla.getGlobalStatus().name(),
                    "Le ticket est entré en risque SLA",
                    actorId
            );
        }

        if (ticketSla.getGlobalStatus() == SlaStatus.BREACHED) {
            if (previousGlobalStatus != SlaStatus.BREACHED) {
                if (ticket.getAssignedUserId() != null) {
                    notificationService.createNotificationIfAbsent(
                            ticket.getAssignedUserId(),
                            ticket.getId(),
                            NotificationType.SLA_BREACHED,
                            "SLA dépassé",
                            "Le ticket " + ticket.getReference() + " a dépassé son échéance SLA."
                    );
                    ticketSla.setLastAlertAt(now);
                    updated = true;
                }
                ticketHistoryService.recordEvent(
                        ticket,
                        TicketHistoryActionType.SLA_BREACHED,
                        previousGlobalStatus == null ? null : previousGlobalStatus.name(),
                        ticketSla.getGlobalStatus().name(),
                        "Le ticket a dépassé son SLA",
                        actorId
                );
            }

            if (defaultEscalationLevel(ticketSla.getEscalationLevel()) < 1) {
                notificationService.createNotificationsIfAbsent(
                        slaRecipientDirectoryService.getLevelOneEscalationRecipients(),
                        ticket.getId(),
                        NotificationType.SLA_ESCALATION_LEVEL_1,
                        "Escalade superviseur",
                        "Le ticket " + ticket.getReference() + " a été escaladé au niveau superviseur."
                );
                ticketSla.setEscalationLevel(1);
                ticketSla.setLastEscalationAt(now);
                updated = true;
                ticketHistoryService.recordEvent(
                        ticket,
                        TicketHistoryActionType.SLA_ESCALATED_LEVEL_1,
                        String.valueOf(previousEscalationLevel),
                        "1",
                        "Escalade SLA au niveau superviseur",
                        actorId
                );
            }

            if (shouldEscalateToLevelTwo(ticket, ticketSla, previousEscalationLevel, previousEscalationAt, now)) {
                notificationService.createNotificationsIfAbsent(
                        slaRecipientDirectoryService.getLevelTwoEscalationRecipients(),
                        ticket.getId(),
                        NotificationType.SLA_ESCALATION_LEVEL_2,
                        "Escalade administrateur",
                        "Le ticket " + ticket.getReference() + " a été escaladé au niveau administrateur."
                );
                ticketSla.setEscalationLevel(2);
                ticketSla.setLastEscalationAt(now);
                updated = true;
                ticketHistoryService.recordEvent(
                        ticket,
                        TicketHistoryActionType.SLA_ESCALATED_LEVEL_2,
                        String.valueOf(Math.max(previousEscalationLevel, 1)),
                        "2",
                        "Escalade SLA au niveau administrateur",
                        actorId
                );
            }
        }

        if (updated) {
            ticketSlaRepository.save(ticketSla);
        }
    }

    private boolean shouldEscalateToLevelTwo(
            Ticket ticket,
            TicketSla ticketSla,
            int previousEscalationLevel,
            LocalDateTime previousEscalationAt,
            LocalDateTime now
    ) {
        if (defaultEscalationLevel(ticketSla.getEscalationLevel()) >= 2) {
            return false;
        }
        if (ticket.getCriticality() == TicketCriticality.CRITICAL) {
            return true;
        }
        if (previousEscalationLevel < 1 || previousEscalationAt == null) {
            return false;
        }
        return !now.isBefore(previousEscalationAt.plus(LEVEL_TWO_ESCALATION_DELAY));
    }

    private Map<Long, Ticket> synchronizeTrackedTickets() {
        List<TicketSla> trackedSlaRows = ticketSlaRepository.findAll();
        if (trackedSlaRows.isEmpty()) {
            return Map.of();
        }

        List<Long> ticketIds = trackedSlaRows.stream()
                .map(TicketSla::getTicketId)
                .distinct()
                .toList();
        List<Ticket> tickets = ticketRepository.findAllByIdInAndDeletedFalse(ticketIds);
        synchronizeTickets(tickets);
        return tickets.stream().collect(Collectors.toMap(Ticket::getId, ticket -> ticket));
    }

    private void synchronizeTickets(Collection<Ticket> tickets) {
        tickets.forEach(ticket -> upsertTicketSla(ticket, SYSTEM_USER_ID));
    }

    private long countByStatus(List<TicketSla> trackedSlaRows, SlaStatus status) {
        return trackedSlaRows.stream()
                .filter(ticketSla -> ticketSla.getGlobalStatus() == status)
                .count();
    }

    private Double averageResolutionMinutes(List<TicketSla> trackedSlaRows, Map<Long, Ticket> ticketById) {
        List<Long> durations = trackedSlaRows.stream()
                .map(ticketSla -> {
                    Ticket ticket = ticketById.get(ticketSla.getTicketId());
                    if (ticket == null || ticketSla.getResolvedAt() == null) {
                        return null;
                    }
                    return minutesBetween(ticket.getCreatedAt(), ticketSla.getResolvedAt());
                })
                .filter(duration -> duration != null && duration > 0)
                .toList();

        if (durations.isEmpty()) {
            return null;
        }

        return durations.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0D);
    }

    private Double averageResponseMinutes(List<TicketSla> trackedSlaRows, Map<Long, Ticket> ticketById) {
        List<Long> durations = trackedSlaRows.stream()
                .map(ticketSla -> {
                    Ticket ticket = ticketById.get(ticketSla.getTicketId());
                    if (ticket == null || ticketSla.getFirstResponseAt() == null) {
                        return null;
                    }
                    return minutesBetween(ticket.getCreatedAt(), ticketSla.getFirstResponseAt());
                })
                .filter(duration -> duration != null && duration >= 0)
                .toList();

        if (durations.isEmpty()) {
            return null;
        }

        return durations.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0D);
    }

    private Double computeComplianceRate(List<TicketSla> trackedSlaRows, Map<Long, Ticket> ticketById) {
        List<TicketSla> completedApplicable = trackedSlaRows.stream()
                .filter(ticketSla -> ticketSla.getPolicyId() != null)
                .filter(ticketSla -> {
                    Ticket ticket = ticketById.get(ticketSla.getTicketId());
                    return ticket != null && isResolvedLike(ticket);
                })
                .toList();

        if (!completedApplicable.isEmpty()) {
            long respectedCompleted = completedApplicable.stream()
                    .filter(ticketSla -> ticketSla.getGlobalStatus() == SlaStatus.RESPECTED)
                    .count();
            return (respectedCompleted * 100D) / completedApplicable.size();
        }

        List<TicketSla> applicable = trackedSlaRows.stream()
                .filter(ticketSla -> ticketSla.getPolicyId() != null)
                .toList();
        if (applicable.isEmpty()) {
            return null;
        }

        long respectedApplicable = applicable.stream()
                .filter(ticketSla -> ticketSla.getGlobalStatus() == SlaStatus.RESPECTED)
                .count();
        return (respectedApplicable * 100D) / applicable.size();
    }

    private List<Ticket> findEmployeeVisibleTickets(Long userId) {
        Map<Long, Ticket> visible = ticketRepository.findByRequesterIdAndDeletedFalseOrderByCreatedAtDesc(userId).stream()
                .collect(Collectors.toMap(Ticket::getId, ticket -> ticket, (left, right) -> left));
        ticketRepository.findByAssignedUserIdAndDeletedFalseOrderByCreatedAtDesc(userId)
                .forEach(ticket -> visible.putIfAbsent(ticket.getId(), ticket));
        return List.copyOf(visible.values());
    }

    private Optional<SlaUrgentTicketResponse> toUrgentTicketResponse(Ticket ticket, TicketSla ticketSla) {
        if (ticket == null || ticketSla == null) {
            return Optional.empty();
        }

        return Optional.of(new SlaUrgentTicketResponse(
                ticket.getId(),
                ticket.getReference(),
                ticket.getTitle(),
                ticket.getStatus(),
                TicketLabelResolver.statusLabel(ticket.getStatus()),
                ticket.getPriority(),
                TicketLabelResolver.priorityLabel(ticket.getPriority()),
                ticket.getCriticality(),
                TicketLabelResolver.criticalityLabel(ticket.getCriticality()),
                ticketSla.getGlobalStatus(),
                TicketLabelResolver.slaStatusLabel(ticketSla.getGlobalStatus()),
                ticketSla.getRemainingMinutes(),
                ticketSla.getConsumedPercentage(),
                ticketSla.getResolutionDeadline(),
                ticket.getAssignedUserId()
        ));
    }

    private Comparator<SlaUrgentTicketResponse> urgentTicketComparator() {
        return Comparator
                .comparingInt((SlaUrgentTicketResponse response) -> urgentStatusRank(response.globalStatus()))
                .thenComparingInt(response -> urgentCriticalityRank(response.criticality()))
                .thenComparing(response -> response.remainingMinutes() == null ? Long.MAX_VALUE : response.remainingMinutes())
                .thenComparing(SlaUrgentTicketResponse::ticketReference, Comparator.nullsLast(String::compareToIgnoreCase));
    }

    private int urgentStatusRank(SlaStatus status) {
        if (status == SlaStatus.BREACHED) {
            return 0;
        }
        if (status == SlaStatus.AT_RISK) {
            return 1;
        }
        return 2;
    }

    private int urgentCriticalityRank(TicketCriticality criticality) {
        if (criticality == TicketCriticality.CRITICAL) {
            return 0;
        }
        if (criticality == TicketCriticality.HIGH) {
            return 1;
        }
        if (criticality == TicketCriticality.MEDIUM) {
            return 2;
        }
        return 3;
    }

    private SlaStatus computeResponseStatus(
            Ticket ticket,
            TicketSla ticketSla,
            SlaPolicy policy,
            LocalDateTime calculatedAt
    ) {
        if (ticketSla.getResponseDeadline() == null) {
            return SlaStatus.NOT_APPLICABLE;
        }
        if (ticketSla.getFirstResponseAt() != null) {
            return ticketSla.getFirstResponseAt().isAfter(ticketSla.getResponseDeadline())
                    ? SlaStatus.BREACHED
                    : SlaStatus.RESPECTED;
        }
        if (PAUSED_STATUSES.contains(ticket.getStatus())) {
            return SlaStatus.PAUSED;
        }
        if (isResolvedLike(ticket) && ticketSla.getFirstResponseAt() == null) {
            return calculatedAt.isAfter(ticketSla.getResponseDeadline())
                    ? SlaStatus.BREACHED
                    : SlaStatus.RESPECTED;
        }
        if (calculatedAt.isAfter(ticketSla.getResponseDeadline())) {
            return SlaStatus.BREACHED;
        }
        double consumedPercentage = percentage(minutesBetween(ticket.getCreatedAt(), calculatedAt), policy.getResponseTimeMinutes());
        if (consumedPercentage >= policy.getWarningThresholdPercent()) {
            return SlaStatus.AT_RISK;
        }
        return SlaStatus.RESPECTED;
    }

    private SlaStatus computeResolutionStatus(
            Ticket ticket,
            TicketSla ticketSla,
            SlaPolicy policy,
            LocalDateTime calculatedAt,
            double consumedPercentage
    ) {
        if (ticketSla.getResolutionDeadline() == null) {
            return SlaStatus.NOT_APPLICABLE;
        }
        if (isResolvedLike(ticket)) {
            LocalDateTime end = ticketSla.getResolvedAt();
            if (end == null) {
                return SlaStatus.RESPECTED;
            }
            return end.isAfter(ticketSla.getResolutionDeadline()) ? SlaStatus.BREACHED : SlaStatus.RESPECTED;
        }
        if (PAUSED_STATUSES.contains(ticket.getStatus())) {
            return SlaStatus.PAUSED;
        }
        if (calculatedAt.isAfter(ticketSla.getResolutionDeadline())) {
            return SlaStatus.BREACHED;
        }
        if (consumedPercentage >= policy.getWarningThresholdPercent()) {
            return SlaStatus.AT_RISK;
        }
        return SlaStatus.RESPECTED;
    }

    private SlaStatus computeGlobalStatus(
            Ticket ticket,
            TicketSla ticketSla,
            SlaPolicy policy,
            LocalDateTime calculatedAt,
            double consumedPercentage
    ) {
        if (ticketSla.getPolicyId() == null) {
            return SlaStatus.NOT_APPLICABLE;
        }
        if (isResolvedLike(ticket)) {
            LocalDateTime end = ticketSla.getResolvedAt();
            if (end != null && end.isAfter(ticketSla.getResolutionDeadline())) {
                return SlaStatus.BREACHED;
            }
            return SlaStatus.RESPECTED;
        }
        if (PAUSED_STATUSES.contains(ticket.getStatus())) {
            return SlaStatus.PAUSED;
        }
        if (calculatedAt.isAfter(ticketSla.getResolutionDeadline())) {
            return SlaStatus.BREACHED;
        }
        if (consumedPercentage >= policy.getWarningThresholdPercent()) {
            return SlaStatus.AT_RISK;
        }
        return SlaStatus.RESPECTED;
    }

    private String resolveBreachReason(
            Ticket ticket,
            TicketSla ticketSla,
            SlaStatus globalStatus,
            SlaStatus resolutionStatus,
            SlaStatus responseStatus
    ) {
        if (globalStatus == SlaStatus.NOT_APPLICABLE) {
            return "Aucune politique SLA active ne correspond à ce ticket";
        }
        if (resolutionStatus == SlaStatus.BREACHED && ticketSla.getResolutionDeadline() != null) {
            if (isResolvedLike(ticket)) {
                return "Le ticket a été résolu après l'échéance de résolution";
            }
            return "L'échéance de résolution est dépassée";
        }
        if (responseStatus == SlaStatus.BREACHED && ticketSla.getResponseDeadline() != null) {
            return "La prise en charge initiale a dépassé l'échéance de réponse";
        }
        return null;
    }

    private void applyNotApplicable(TicketSla ticketSla, LocalDateTime calculatedAt) {
        ticketSla.setPolicyId(null);
        ticketSla.setResponseDeadline(null);
        ticketSla.setResolutionDeadline(null);
        ticketSla.setResponseStatus(SlaStatus.NOT_APPLICABLE);
        ticketSla.setResolutionStatus(SlaStatus.NOT_APPLICABLE);
        ticketSla.setGlobalStatus(SlaStatus.NOT_APPLICABLE);
        ticketSla.setElapsedMinutes(0L);
        ticketSla.setRemainingMinutes(null);
        ticketSla.setConsumedPercentage(0D);
        ticketSla.setBreachReason("Aucune politique SLA active ne correspond à ce ticket");
        ticketSla.setLastCalculatedAt(calculatedAt);
        ticketSla.setEscalationLevel(0);
        ticketSla.setLastEscalationAt(null);
    }

    private TicketSla buildNotApplicableTicketSla(Ticket ticket) {
        TicketSla ticketSla = new TicketSla();
        ticketSla.setTicketId(ticket.getId());
        ticketSla.setEscalationLevel(0);
        ticketSla.setFirstResponseAt(resolveFirstResponseAt(ticket, null));
        ticketSla.setResolvedAt(resolveResolutionAt(ticket));
        applyNotApplicable(ticketSla, LocalDateTime.now());
        return ticketSla;
    }

    private LocalDateTime resolveFirstResponseAt(Ticket ticket, LocalDateTime currentValue) {
        if (currentValue != null) {
            return currentValue;
        }
        if (ticket.getStartedAt() != null) {
            return ticket.getStartedAt();
        }
        return ticket.getAssignedAt();
    }

    private LocalDateTime resolveResolutionAt(Ticket ticket) {
        if (ticket.getResolvedAt() != null) {
            return ticket.getResolvedAt();
        }
        return ticket.getClosedAt();
    }

    private LocalDateTime resolveEffectiveEnd(Ticket ticket, LocalDateTime calculatedAt) {
        if (ticket.getClosedAt() != null) {
            return ticket.getClosedAt();
        }
        if (ticket.getResolvedAt() != null) {
            return ticket.getResolvedAt();
        }
        return calculatedAt;
    }

    private boolean isResolvedLike(Ticket ticket) {
        return ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED;
    }

    private long minutesBetween(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            return 0L;
        }
        return Math.max(0L, Duration.between(start, end).toMinutes());
    }

    private double percentage(long elapsedMinutes, int thresholdMinutes) {
        if (thresholdMinutes <= 0) {
            return 0D;
        }
        return (elapsedMinutes * 100D) / thresholdMinutes;
    }

    private int defaultEscalationLevel(Integer escalationLevel) {
        return escalationLevel == null ? 0 : escalationLevel;
    }

    private SlaPolicy findPolicy(Long id) {
        return slaPolicyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Politique SLA introuvable"));
    }

    private Ticket findTicket(Long id) {
        return ticketRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket introuvable"));
    }

    private void applyPolicyValues(
            SlaPolicy policy,
            String name,
            com.cgi.intranet.ticket.enums.TicketType incidentType,
            com.cgi.intranet.ticket.enums.TicketPriority priority,
            TicketCriticality criticality,
            Integer responseTimeMinutes,
            Integer resolutionTimeMinutes,
            Integer warningThresholdPercent
    ) {
        if (responseTimeMinutes > resolutionTimeMinutes) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le délai de prise en charge ne peut pas dépasser le délai de résolution"
            );
        }

        policy.setName(clean(name));
        policy.setIncidentType(incidentType);
        policy.setPriority(priority);
        policy.setCriticality(criticality);
        policy.setResponseTimeMinutes(responseTimeMinutes);
        policy.setResolutionTimeMinutes(resolutionTimeMinutes);
        policy.setWarningThresholdPercent(warningThresholdPercent);
    }

    private String resolvePolicyName(Long policyId) {
        if (policyId == null) {
            return null;
        }
        return slaPolicyRepository.findById(policyId)
                .map(SlaPolicy::getName)
                .orElse(null);
    }

    private SlaPolicyResponse toPolicyResponse(SlaPolicy policy) {
        return new SlaPolicyResponse(
                policy.getId(),
                policy.getName(),
                policy.getIncidentType(),
                TicketLabelResolver.typeLabel(policy.getIncidentType()),
                policy.getPriority(),
                TicketLabelResolver.priorityLabel(policy.getPriority()),
                policy.getCriticality(),
                TicketLabelResolver.criticalityLabel(policy.getCriticality()),
                policy.getResponseTimeMinutes(),
                policy.getResolutionTimeMinutes(),
                policy.getWarningThresholdPercent(),
                policy.isActive(),
                policy.getCreatedAt(),
                policy.getUpdatedAt()
        );
    }

    private TicketSlaResponse toTicketSlaResponse(TicketSla ticketSla, String policyName) {
        return new TicketSlaResponse(
                ticketSla.getTicketId(),
                ticketSla.getPolicyId(),
                policyName,
                ticketSla.getResponseDeadline(),
                ticketSla.getResolutionDeadline(),
                ticketSla.getFirstResponseAt(),
                ticketSla.getResolvedAt(),
                ticketSla.getResponseStatus(),
                TicketLabelResolver.slaStatusLabel(ticketSla.getResponseStatus()),
                ticketSla.getResolutionStatus(),
                TicketLabelResolver.slaStatusLabel(ticketSla.getResolutionStatus()),
                ticketSla.getGlobalStatus(),
                TicketLabelResolver.slaStatusLabel(ticketSla.getGlobalStatus()),
                ticketSla.getElapsedMinutes(),
                ticketSla.getRemainingMinutes(),
                ticketSla.getConsumedPercentage(),
                ticketSla.getBreachReason(),
                ticketSla.getLastCalculatedAt()
        );
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
