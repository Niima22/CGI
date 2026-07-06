package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.repository.TicketRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class SlaMonitoringJob {

    private static final Set<TicketStatus> TERMINAL_STATUSES = Set.of(
            TicketStatus.RESOLVED,
            TicketStatus.CLOSED,
            TicketStatus.CANCELLED
    );

    private final TicketRepository ticketRepository;
    private final SlaService slaService;

    public SlaMonitoringJob(TicketRepository ticketRepository, SlaService slaService) {
        this.ticketRepository = ticketRepository;
        this.slaService = slaService;
    }

    @Scheduled(fixedDelayString = "${sla.monitoring.delay-ms:60000}")
    public void monitorActiveSla() {
        List<Ticket> activeTickets = ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc().stream()
                .filter(ticket -> !TERMINAL_STATUSES.contains(ticket.getStatus()))
                .toList();

        activeTickets.forEach(ticket -> slaService.synchronizeTicketSla(ticket, 0L));
    }
}
