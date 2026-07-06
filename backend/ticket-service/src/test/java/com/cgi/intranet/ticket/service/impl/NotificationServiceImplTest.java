package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.entity.Notification;
import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.repository.NotificationRepository;
import com.cgi.intranet.ticket.service.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private CurrentUserService currentUserService;

    private NotificationServiceImpl notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationServiceImpl(notificationRepository, currentUserService);
    }

    @Test
    void createNotificationIfAbsentSavesNotificationWhenItDoesNotExist() {
        when(notificationRepository.existsByRecipientUserIdAndTicketIdAndType(42L, 1L, NotificationType.TICKET_ASSIGNED))
                .thenReturn(false);

        notificationService.createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_ASSIGNED,
                "Ticket affecte",
                "Le ticket TCK-001 vous a ete affecte."
        );

        verify(notificationRepository).save(ArgumentMatchers.any(Notification.class));
    }

    @Test
    void createNotificationIfAbsentDoesNotSaveDuplicateNotification() {
        when(notificationRepository.existsByRecipientUserIdAndTicketIdAndType(42L, 1L, NotificationType.TICKET_ASSIGNED))
                .thenReturn(true);

        notificationService.createNotificationIfAbsent(
                42L,
                1L,
                NotificationType.TICKET_ASSIGNED,
                "Ticket affecte",
                "Le ticket TCK-001 vous a ete affecte."
        );

        verify(notificationRepository, never()).save(ArgumentMatchers.any(Notification.class));
    }
}
