package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Set;

@Component
public class PendingTicketReminderJob {

    private static final Set<TicketStatus> PENDING_STATUSES = Set.of(
            TicketStatus.WAITING_REQUESTER,
            TicketStatus.WAITING_PROVIDER,
            TicketStatus.WAITING_MANAGER_VALIDATION
    );

    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;
    private final long reminderAgeMinutes;

    public PendingTicketReminderJob(
            TicketRepository ticketRepository,
            NotificationService notificationService,
            @Value("${ticket.pending-reminder.age-minutes:1440}") long reminderAgeMinutes
    ) {
        this.ticketRepository = ticketRepository;
        this.notificationService = notificationService;
        this.reminderAgeMinutes = reminderAgeMinutes;
    }

    @Scheduled(fixedDelayString = "${ticket.pending-reminder.delay-ms:60000}")
    public void remindPendingTickets() {
        LocalDateTime reminderThreshold = LocalDateTime.now().minusMinutes(reminderAgeMinutes);

        ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc().stream()
                .filter(ticket -> PENDING_STATUSES.contains(ticket.getStatus()))
                .filter(ticket -> ticket.getAssignedUserId() != null)
                .filter(ticket -> ticket.getUpdatedAt() != null && !ticket.getUpdatedAt().isAfter(reminderThreshold))
                .forEach(this::createPendingReminder);
    }

    private void createPendingReminder(Ticket ticket) {
        // Current notification uniqueness allows only one pending reminder per user/ticket/type.
        notificationService.createNotificationIfAbsent(
                ticket.getAssignedUserId(),
                ticket.getId(),
                NotificationType.TICKET_PENDING_REMINDER,
                "Ticket en attente prolongee",
                "Le ticket " + ticket.getReference() + " est en attente depuis un certain temps. Merci de verifier son suivi."
        );
    }
}
