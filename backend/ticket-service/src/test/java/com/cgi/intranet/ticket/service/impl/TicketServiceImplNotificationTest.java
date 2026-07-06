package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.dto.request.TicketUpdateRequest;
import com.cgi.intranet.ticket.dto.response.TicketSlaResponse;
import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.enums.TicketType;
import com.cgi.intranet.ticket.mapper.TicketMapper;
import com.cgi.intranet.ticket.repository.TicketRepository;
import com.cgi.intranet.ticket.service.CurrentUserService;
import com.cgi.intranet.ticket.service.NotificationService;
import com.cgi.intranet.ticket.service.SlaService;
import com.cgi.intranet.ticket.service.TicketAuthorizationService;
import com.cgi.intranet.ticket.service.TicketHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketServiceImplNotificationTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private TicketHistoryService ticketHistoryService;

    @Mock
    private TicketAuthorizationService ticketAuthorizationService;

    @Mock
    private SlaService slaService;

    private TicketServiceImpl ticketService;

    @BeforeEach
    void setUp() {
        ticketService = new TicketServiceImpl(
                ticketRepository,
                new TicketMapper(),
                null,
                currentUserService,
                notificationService,
                ticketHistoryService,
                ticketAuthorizationService,
                slaService
        );

        doNothing().when(ticketAuthorizationService)
                .ensureUpdatable(ArgumentMatchers.any(Ticket.class), ArgumentMatchers.any(CurrentUserService.CurrentUser.class));
        when(ticketRepository.save(ArgumentMatchers.any(Ticket.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(slaService.synchronizeTicketSla(ArgumentMatchers.any(Ticket.class), ArgumentMatchers.anyLong()))
                .thenReturn(emptySlaResponse());
    }

    @Test
    void updateTicketCreatesAssignmentNotificationWhenAssignedUserWasNull() {
        Ticket ticket = existingTicket(TicketStatus.NEW, null);
        when(currentUserService.getCurrentUser()).thenReturn(currentUser(900L));
        when(ticketRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(ticket));

        TicketUpdateRequest request = new TicketUpdateRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                42L,
                null,
                null
        );

        ticketService.updateTicket(1L, request);

        verify(notificationService).createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_ASSIGNED,
                "Ticket affecte",
                "Le ticket TCK-001 vous a ete affecte."
        );
    }

    @Test
    void updateTicketDoesNotCreateAssignmentNotificationWhenAssignedUserDoesNotChange() {
        Ticket ticket = existingTicket(TicketStatus.NEW, 42L);
        when(currentUserService.getCurrentUser()).thenReturn(currentUser(900L));
        when(ticketRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(ticket));

        TicketUpdateRequest request = new TicketUpdateRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                42L,
                null,
                null
        );

        ticketService.updateTicket(1L, request);

        verify(notificationService, never()).createNotificationIfAbsent(
                ArgumentMatchers.eq(42L),
                ArgumentMatchers.eq(1L),
                ArgumentMatchers.eq(NotificationType.TICKET_ASSIGNED),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
        verify(notificationService, never()).createNotificationIfAbsent(
                ArgumentMatchers.eq(42L),
                ArgumentMatchers.eq(1L),
                ArgumentMatchers.eq(NotificationType.TICKET_REASSIGNED),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
    }

    @Test
    void updateTicketCreatesReassignmentNotificationWhenAssignedUserChanges() {
        Ticket ticket = existingTicket(TicketStatus.NEW, 11L);
        when(currentUserService.getCurrentUser()).thenReturn(currentUser(900L));
        when(ticketRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(ticket));

        TicketUpdateRequest request = new TicketUpdateRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                42L,
                null,
                null
        );

        ticketService.updateTicket(1L, request);

        verify(notificationService).createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_REASSIGNED,
                "Ticket reaffecte",
                "Le ticket TCK-001 vous a ete reassigne."
        );
    }

    @Test
    void updateTicketCreatesStatusUpdateNotificationForAssignedUserWhenAnotherUserChangesStatus() {
        Ticket ticket = existingTicket(TicketStatus.TODO, 42L);
        when(currentUserService.getCurrentUser()).thenReturn(currentUser(900L));
        when(ticketRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(ticket));

        TicketUpdateRequest request = new TicketUpdateRequest(
                null,
                null,
                null,
                null,
                null,
                TicketStatus.IN_PROGRESS,
                null,
                null,
                null,
                null,
                null
        );

        ticketService.updateTicket(1L, request);

        verify(notificationService).createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_STATUS_UPDATED,
                "Statut du ticket mis a jour",
                "Le statut du ticket TCK-001 est passe a En cours."
        );
    }

    @Test
    void updateTicketDoesNotCreateStatusNotificationWhenStatusDoesNotChange() {
        Ticket ticket = existingTicket(TicketStatus.TODO, 42L);
        when(currentUserService.getCurrentUser()).thenReturn(currentUser(900L));
        when(ticketRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(ticket));

        TicketUpdateRequest request = new TicketUpdateRequest(
                null,
                null,
                null,
                null,
                null,
                TicketStatus.TODO,
                null,
                null,
                null,
                null,
                null
        );

        ticketService.updateTicket(1L, request);

        verify(notificationService, never()).createNotificationIfAbsent(
                ArgumentMatchers.anyLong(),
                ArgumentMatchers.eq(1L),
                ArgumentMatchers.eq(NotificationType.TICKET_STATUS_UPDATED),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
    }

    @Test
    void updateTicketDoesNotCreateStatusNotificationForSelfAction() {
        Ticket ticket = existingTicket(TicketStatus.TODO, 42L);
        when(currentUserService.getCurrentUser()).thenReturn(currentUser(42L));
        when(ticketRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(ticket));

        TicketUpdateRequest request = new TicketUpdateRequest(
                null,
                null,
                null,
                null,
                null,
                TicketStatus.IN_PROGRESS,
                null,
                null,
                null,
                null,
                null
        );

        ticketService.updateTicket(1L, request);

        verify(notificationService, never()).createNotificationIfAbsent(
                ArgumentMatchers.eq(42L),
                ArgumentMatchers.eq(1L),
                ArgumentMatchers.eq(NotificationType.TICKET_STATUS_UPDATED),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
    }

    @Test
    void updateTicketDoesNotCreateStatusNotificationWithoutAssignedUser() {
        Ticket ticket = existingTicket(TicketStatus.TODO, null);
        when(currentUserService.getCurrentUser()).thenReturn(currentUser(900L));
        when(ticketRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(ticket));

        TicketUpdateRequest request = new TicketUpdateRequest(
                null,
                null,
                null,
                null,
                null,
                TicketStatus.IN_PROGRESS,
                null,
                null,
                null,
                null,
                null
        );

        ticketService.updateTicket(1L, request);

        verify(notificationService, never()).createNotificationIfAbsent(
                ArgumentMatchers.anyLong(),
                ArgumentMatchers.eq(1L),
                ArgumentMatchers.eq(NotificationType.TICKET_STATUS_UPDATED),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
    }

    private CurrentUserService.CurrentUser currentUser(Long userId) {
        return new CurrentUserService.CurrentUser(userId, "kc-" + userId, true, false, false);
    }

    private Ticket existingTicket(TicketStatus status, Long assignedUserId) {
        Ticket ticket = new Ticket();
        ReflectionTestUtils.setField(ticket, "id", 1L);
        ReflectionTestUtils.setField(ticket, "createdAt", LocalDateTime.now().minusDays(2));
        ReflectionTestUtils.setField(ticket, "updatedAt", LocalDateTime.now().minusHours(3));
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

    private TicketSlaResponse emptySlaResponse() {
        return new TicketSlaResponse(
                1L,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
