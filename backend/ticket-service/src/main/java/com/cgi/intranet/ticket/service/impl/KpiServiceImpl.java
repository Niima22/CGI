package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.dto.response.EmployeeProductivityKpiResponse;
import com.cgi.intranet.ticket.dto.response.EmployeeWorkloadKpiResponse;
import com.cgi.intranet.ticket.dto.response.KpiEmployeeSummaryResponse;
import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.entity.TicketSla;
import com.cgi.intranet.ticket.enums.SlaStatus;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.repository.TicketRepository;
import com.cgi.intranet.ticket.repository.TicketSlaRepository;
import com.cgi.intranet.ticket.service.CurrentUserService;
import com.cgi.intranet.ticket.service.KpiService;
import com.cgi.intranet.ticket.service.SlaService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class KpiServiceImpl implements KpiService {

    private static final Set<TicketStatus> ACTIVE_STATUSES = Set.of(
            TicketStatus.NEW,
            TicketStatus.TODO,
            TicketStatus.ASSIGNED,
            TicketStatus.IN_PROGRESS,
            TicketStatus.WAITING_REQUESTER,
            TicketStatus.WAITING_PROVIDER,
            TicketStatus.WAITING_MANAGER_VALIDATION,
            TicketStatus.REOPENED
    );

    private final TicketRepository ticketRepository;
    private final TicketSlaRepository ticketSlaRepository;
    private final CurrentUserService currentUserService;
    private final SlaService slaService;

    public KpiServiceImpl(
            TicketRepository ticketRepository,
            TicketSlaRepository ticketSlaRepository,
            CurrentUserService currentUserService,
            SlaService slaService
    ) {
        this.ticketRepository = ticketRepository;
        this.ticketSlaRepository = ticketSlaRepository;
        this.currentUserService = currentUserService;
        this.slaService = slaService;
    }

    @Override
    @Transactional
    public List<EmployeeWorkloadKpiResponse> getEmployeeWorkload(Integer limit, String sort) {
        ensureKpiReadable();
        KpiSnapshot snapshot = buildSnapshot();

        List<EmployeeWorkloadKpiResponse> rows = snapshot.ticketsByAgent().entrySet().stream()
                .map(entry -> buildWorkloadRow(entry.getKey(), entry.getValue(), snapshot.slaByTicketId()))
                .sorted(workloadComparator(sort))
                .toList();

        return applyLimit(rows, limit);
    }

    @Override
    @Transactional
    public List<EmployeeProductivityKpiResponse> getEmployeeProductivity(Integer limit, String sort) {
        ensureKpiReadable();
        KpiSnapshot snapshot = buildSnapshot();

        List<EmployeeProductivityKpiResponse> rows = snapshot.ticketsByAgent().entrySet().stream()
                .map(entry -> buildProductivityRow(entry.getKey(), entry.getValue(), snapshot.slaByTicketId()))
                .sorted(productivityComparator(sort))
                .toList();

        return applyLimit(rows, limit);
    }

    @Override
    @Transactional
    public KpiEmployeeSummaryResponse getEmployeeSummary() {
        ensureKpiReadable();
        KpiSnapshot snapshot = buildSnapshot();

        List<EmployeeWorkloadKpiResponse> workloads = snapshot.ticketsByAgent().entrySet().stream()
                .map(entry -> buildWorkloadRow(entry.getKey(), entry.getValue(), snapshot.slaByTicketId()))
                .toList();
        List<EmployeeProductivityKpiResponse> productivity = snapshot.ticketsByAgent().entrySet().stream()
                .map(entry -> buildProductivityRow(entry.getKey(), entry.getValue(), snapshot.slaByTicketId()))
                .toList();

        long totalAgentsWithTickets = snapshot.ticketsByAgent().size();
        long totalActiveAssignedTickets = workloads.stream()
                .mapToLong(EmployeeWorkloadKpiResponse::totalAssignedTickets)
                .sum();
        Double averageWorkloadScore = workloads.isEmpty()
                ? null
                : workloads.stream().mapToLong(EmployeeWorkloadKpiResponse::workloadScore).average().orElse(0D);

        List<Double> complianceRates = productivity.stream()
                .map(EmployeeProductivityKpiResponse::slaComplianceRate)
                .filter(Objects::nonNull)
                .toList();

        Double bestSlaComplianceRate = complianceRates.isEmpty()
                ? null
                : complianceRates.stream().mapToDouble(Double::doubleValue).max().orElse(0D);
        Double lowestSlaComplianceRate = complianceRates.isEmpty()
                ? null
                : complianceRates.stream().mapToDouble(Double::doubleValue).min().orElse(0D);

        return new KpiEmployeeSummaryResponse(
                totalAgentsWithTickets,
                totalActiveAssignedTickets,
                averageWorkloadScore,
                bestSlaComplianceRate,
                lowestSlaComplianceRate,
                LocalDateTime.now()
        );
    }

    private KpiSnapshot buildSnapshot() {
        // TODO: managers currently use the same global visibility pattern as tickets until manager scoping is refined.
        List<Ticket> assignedTickets = ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc().stream()
                .filter(ticket -> ticket.getAssignedUserId() != null)
                .toList();

        assignedTickets.forEach(ticket -> {
            try {
                slaService.synchronizeTicketSla(ticket, 0L);
            } catch (RuntimeException ignored) {
                // Keep KPI computation resilient even if one SLA sync fails.
            }
        });

        Map<Long, List<Ticket>> ticketsByAgent = assignedTickets.stream()
                .collect(Collectors.groupingBy(Ticket::getAssignedUserId, LinkedHashMap::new, Collectors.toList()));

        Map<Long, TicketSla> slaByTicketId = ticketSlaRepository.findAllByTicketIdIn(
                        assignedTickets.stream().map(Ticket::getId).toList()
                ).stream()
                .collect(Collectors.toMap(TicketSla::getTicketId, Function.identity()));

        return new KpiSnapshot(ticketsByAgent, slaByTicketId);
    }

    private EmployeeWorkloadKpiResponse buildWorkloadRow(
            Long assignedUserId,
            List<Ticket> tickets,
            Map<Long, TicketSla> slaByTicketId
    ) {
        List<Ticket> activeTickets = tickets.stream()
                .filter(ticket -> ACTIVE_STATUSES.contains(ticket.getStatus()))
                .toList();

        long totalAssignedTickets = activeTickets.size();
        long todoTickets = activeTickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.NEW || ticket.getStatus() == TicketStatus.TODO)
                .count();
        long assignedTickets = activeTickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.ASSIGNED)
                .count();
        long inProgressTickets = activeTickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.IN_PROGRESS)
                .count();
        long waitingTickets = activeTickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.WAITING_REQUESTER
                        || ticket.getStatus() == TicketStatus.WAITING_PROVIDER
                        || ticket.getStatus() == TicketStatus.WAITING_MANAGER_VALIDATION)
                .count();
        long atRiskTickets = activeTickets.stream()
                .filter(ticket -> matchesSlaStatus(slaByTicketId.get(ticket.getId()), SlaStatus.AT_RISK))
                .count();
        long breachedTickets = activeTickets.stream()
                .filter(ticket -> matchesSlaStatus(slaByTicketId.get(ticket.getId()), SlaStatus.BREACHED))
                .count();
        long criticalTickets = activeTickets.stream()
                .filter(ticket -> ticket.getCriticality() == TicketCriticality.HIGH
                        || ticket.getCriticality() == TicketCriticality.CRITICAL)
                .count();

        long workloadScore = totalAssignedTickets
                + (criticalTickets * 2L)
                + (atRiskTickets * 3L)
                + (breachedTickets * 4L);

        return new EmployeeWorkloadKpiResponse(
                assignedUserId,
                buildAssignedUserLabel(assignedUserId),
                totalAssignedTickets,
                todoTickets,
                assignedTickets,
                inProgressTickets,
                waitingTickets,
                atRiskTickets,
                breachedTickets,
                criticalTickets,
                workloadScore
        );
    }

    private EmployeeProductivityKpiResponse buildProductivityRow(
            Long assignedUserId,
            List<Ticket> tickets,
            Map<Long, TicketSla> slaByTicketId
    ) {
        long resolvedTickets = tickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.RESOLVED)
                .count();
        long closedTickets = tickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.CLOSED)
                .count();
        long processedTickets = resolvedTickets + closedTickets;

        List<Long> treatmentDurations = tickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED)
                .map(this::resolveTreatmentMinutes)
                .filter(Objects::nonNull)
                .toList();

        Double averageTreatmentMinutes = treatmentDurations.isEmpty()
                ? null
                : treatmentDurations.stream().mapToLong(Long::longValue).average().orElse(0D);

        List<Ticket> applicableProcessedTickets = tickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED)
                .filter(ticket -> {
                    TicketSla ticketSla = slaByTicketId.get(ticket.getId());
                    return ticketSla != null && ticketSla.getPolicyId() != null;
                })
                .toList();

        long slaRespectedTickets = applicableProcessedTickets.stream()
                .filter(ticket -> matchesSlaStatus(slaByTicketId.get(ticket.getId()), SlaStatus.RESPECTED))
                .count();
        long slaBreachedTickets = applicableProcessedTickets.stream()
                .filter(ticket -> matchesSlaStatus(slaByTicketId.get(ticket.getId()), SlaStatus.BREACHED))
                .count();

        Double slaComplianceRate = applicableProcessedTickets.isEmpty()
                ? 0D
                : (slaRespectedTickets * 100D) / applicableProcessedTickets.size();

        return new EmployeeProductivityKpiResponse(
                assignedUserId,
                buildAssignedUserLabel(assignedUserId),
                resolvedTickets,
                closedTickets,
                processedTickets,
                averageTreatmentMinutes,
                slaRespectedTickets,
                slaBreachedTickets,
                slaComplianceRate
        );
    }

    private Long resolveTreatmentMinutes(Ticket ticket) {
        LocalDateTime effectiveEnd = ticket.getClosedAt() != null ? ticket.getClosedAt() : ticket.getResolvedAt();
        if (ticket.getCreatedAt() == null || effectiveEnd == null) {
            return null;
        }
        return Math.max(0L, Duration.between(ticket.getCreatedAt(), effectiveEnd).toMinutes());
    }

    private boolean matchesSlaStatus(TicketSla ticketSla, SlaStatus status) {
        return ticketSla != null && ticketSla.getGlobalStatus() == status;
    }

    private String buildAssignedUserLabel(Long assignedUserId) {
        return assignedUserId == null ? null : "Agent #" + assignedUserId;
    }

    private Comparator<EmployeeWorkloadKpiResponse> workloadComparator(String sort) {
        if ("criticalTickets".equalsIgnoreCase(sort)) {
            return Comparator
                    .comparingLong(EmployeeWorkloadKpiResponse::criticalTickets).reversed()
                    .thenComparing(Comparator.comparingLong(EmployeeWorkloadKpiResponse::workloadScore).reversed())
                    .thenComparing(EmployeeWorkloadKpiResponse::assignedUserId, Comparator.nullsLast(Long::compareTo));
        }
        if ("breachedTickets".equalsIgnoreCase(sort)) {
            return Comparator
                    .comparingLong(EmployeeWorkloadKpiResponse::breachedTickets).reversed()
                    .thenComparing(Comparator.comparingLong(EmployeeWorkloadKpiResponse::workloadScore).reversed())
                    .thenComparing(EmployeeWorkloadKpiResponse::assignedUserId, Comparator.nullsLast(Long::compareTo));
        }
        return Comparator.comparingLong(EmployeeWorkloadKpiResponse::workloadScore).reversed()
                .thenComparing(Comparator.comparingLong(EmployeeWorkloadKpiResponse::totalAssignedTickets).reversed())
                .thenComparing(EmployeeWorkloadKpiResponse::assignedUserId, Comparator.nullsLast(Long::compareTo));
    }

    private Comparator<EmployeeProductivityKpiResponse> productivityComparator(String sort) {
        if ("slaComplianceRate".equalsIgnoreCase(sort)) {
            return Comparator.comparing(
                            EmployeeProductivityKpiResponse::slaComplianceRate,
                            Comparator.nullsLast(Double::compareTo)
                    ).reversed()
                    .thenComparing(Comparator.comparingLong(EmployeeProductivityKpiResponse::processedTickets).reversed())
                    .thenComparing(EmployeeProductivityKpiResponse::assignedUserId, Comparator.nullsLast(Long::compareTo));
        }
        if ("averageTreatmentMinutes".equalsIgnoreCase(sort)) {
            return Comparator.comparing(
                            EmployeeProductivityKpiResponse::averageTreatmentMinutes,
                            Comparator.nullsLast(Double::compareTo)
                    )
                    .thenComparing(Comparator.comparingLong(EmployeeProductivityKpiResponse::processedTickets).reversed())
                    .thenComparing(EmployeeProductivityKpiResponse::assignedUserId, Comparator.nullsLast(Long::compareTo));
        }
        return Comparator.comparingLong(EmployeeProductivityKpiResponse::processedTickets).reversed()
                .thenComparing(
                        EmployeeProductivityKpiResponse::slaComplianceRate,
                        Comparator.nullsLast(Double::compareTo)
                .reversed())
                .thenComparing(EmployeeProductivityKpiResponse::assignedUserId, Comparator.nullsLast(Long::compareTo));
    }

    private <T> List<T> applyLimit(List<T> rows, Integer limit) {
        if (limit == null || limit <= 0) {
            return rows;
        }
        return rows.stream().limit(limit).toList();
    }

    private void ensureKpiReadable() {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        if (currentUser.admin() || currentUser.manager()) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé aux KPI employés");
    }

    private record KpiSnapshot(
            Map<Long, List<Ticket>> ticketsByAgent,
            Map<Long, TicketSla> slaByTicketId
    ) {
    }
}
