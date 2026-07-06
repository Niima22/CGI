package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.enums.TicketType;
import com.cgi.intranet.ticket.repository.TicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PendingTicketReminderJobTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private NotificationService notificationService;

    @Test
    void remindPendingTicketsCreatesReminderForEligibleWaitingRequesterTicket() {
        Ticket ticket = ticket(TicketStatus.WAITING_REQUESTER, 42L, LocalDateTime.now().minusHours(2));
        when(ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc()).thenReturn(List.of(ticket));

        PendingTicketReminderJob job = new PendingTicketReminderJob(ticketRepository, notificationService, 60);

        job.remindPendingTickets();

        verify(notificationService).createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_PENDING_REMINDER,
                "Ticket en attente prolongee",
                "Le ticket TCK-001 est en attente depuis un certain temps. Merci de verifier son suivi."
        );
    }

    @Test
    void remindPendingTicketsCreatesReminderForEligibleWaitingProviderTicket() {
        Ticket ticket = ticket(TicketStatus.WAITING_PROVIDER, 42L, LocalDateTime.now().minusHours(2));
        when(ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc()).thenReturn(List.of(ticket));

        PendingTicketReminderJob job = new PendingTicketReminderJob(ticketRepository, notificationService, 60);

        job.remindPendingTickets();

        verify(notificationService).createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_PENDING_REMINDER,
                "Ticket en attente prolongee",
                "Le ticket TCK-001 est en attente depuis un certain temps. Merci de verifier son suivi."
        );
    }

    @Test
    void remindPendingTicketsCreatesReminderForEligibleWaitingManagerValidationTicket() {
        Ticket ticket = ticket(TicketStatus.WAITING_MANAGER_VALIDATION, 42L, LocalDateTime.now().minusHours(2));
        when(ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc()).thenReturn(List.of(ticket));

        PendingTicketReminderJob job = new PendingTicketReminderJob(ticketRepository, notificationService, 60);

        job.remindPendingTickets();

        verify(notificationService).createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_PENDING_REMINDER,
                "Ticket en attente prolongee",
                "Le ticket TCK-001 est en attente depuis un certain temps. Merci de verifier son suivi."
        );
    }

    @Test
    void remindPendingTicketsSkipsRecentTicketWithoutAssignedUserAndNonWaitingStatus() {
        Ticket recentTicket = ticket(TicketStatus.WAITING_REQUESTER, 42L, LocalDateTime.now().minusMinutes(10));
        Ticket unassignedTicket = ticket(TicketStatus.WAITING_PROVIDER, null, LocalDateTime.now().minusHours(2));
        Ticket nonWaitingTicket = ticket(TicketStatus.IN_PROGRESS, 42L, LocalDateTime.now().minusHours(2));
        when(ticketRepository.findAllByDeletedFalseOrderByCreatedAtDesc())
                .thenReturn(List.of(recentTicket, unassignedTicket, nonWaitingTicket));

        PendingTicketReminderJob job = new PendingTicketReminderJob(ticketRepository, notificationService, 60);

        job.remindPendingTickets();

        verify(notificationService, never()).createNotificationIfAbsent(
                ArgumentMatchers.anyLong(),
                ArgumentMatchers.anyLong(),
                ArgumentMatchers.eq(NotificationType.TICKET_PENDING_REMINDER),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
    }

    private Ticket ticket(TicketStatus status, Long assignedUserId, LocalDateTime updatedAt) {
        Ticket ticket = new Ticket();
        ReflectionTestUtils.setField(ticket, "id", 1L);
        ReflectionTestUtils.setField(ticket, "createdAt", LocalDateTime.now().minusDays(1));
        ReflectionTestUtils.setField(ticket, "updatedAt", updatedAt);
        ticket.setReference("TCK-001");
        ticket.setTitle("Titre");
        ticket.setDescription("Description");
        ticket.setStatus(status);
        ticket.setType(TicketType.INCIDENT);
        ticket.setPriority(TicketPriority.MEDIUM);
        ticket.setCriticality(TicketCriticality.MEDIUM);
        ticket.setRequesterId(700L);
        ticket.setAssignedUserId(assignedUserId);
        return ticket;
    }
}
