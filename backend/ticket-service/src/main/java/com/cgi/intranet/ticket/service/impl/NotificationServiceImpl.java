package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.dto.response.NotificationResponse;
import com.cgi.intranet.ticket.dto.response.UnreadNotificationCountResponse;
import com.cgi.intranet.ticket.entity.Notification;
import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.repository.NotificationRepository;
import com.cgi.intranet.ticket.service.CurrentUserService;
import com.cgi.intranet.ticket.service.NotificationService;
import com.cgi.intranet.ticket.util.TicketLabelResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;

    public NotificationServiceImpl(
            NotificationRepository notificationRepository,
            CurrentUserService currentUserService
    ) {
        this.notificationRepository = notificationRepository;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional
    public void createNotificationIfAbsent(
            Long recipientUserId,
            Long ticketId,
            NotificationType type,
            String title,
            String message
    ) {
        if (recipientUserId == null || ticketId == null || type == null) {
            return;
        }
        if (notificationRepository.existsByRecipientUserIdAndTicketIdAndType(recipientUserId, ticketId, type)) {
            return;
        }

        Notification notification = new Notification();
        notification.setRecipientUserId(recipientUserId);
        notification.setTicketId(ticketId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void createNotificationsIfAbsent(
            Collection<Long> recipientUserIds,
            Long ticketId,
            NotificationType type,
            String title,
            String message
    ) {
        if (recipientUserIds == null || recipientUserIds.isEmpty()) {
            return;
        }
        recipientUserIds.stream()
                .filter(id -> id != null)
                .distinct()
                .forEach(recipientUserId -> createNotificationIfAbsent(recipientUserId, ticketId, type, title, message));
    }

    @Override
    public List<NotificationResponse> getCurrentUserNotifications() {
        Long recipientUserId = currentUserService.getCurrentUser().userId();
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDescIdDesc(recipientUserId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public UnreadNotificationCountResponse getUnreadCount() {
        Long recipientUserId = currentUserService.getCurrentUser().userId();
        return new UnreadNotificationCountResponse(
                notificationRepository.countByRecipientUserIdAndReadFalse(recipientUserId)
        );
    }

    @Override
    @Transactional
    public NotificationResponse markNotificationRead(Long id) {
        Long recipientUserId = currentUserService.getCurrentUser().userId();
        Notification notification = notificationRepository.findByIdAndRecipientUserId(id, recipientUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification introuvable"));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }

        return toResponse(notification);
    }

    @Override
    @Transactional
    public void markAllNotificationsRead() {
        Long recipientUserId = currentUserService.getCurrentUser().userId();
        notificationRepository.markAllAsRead(recipientUserId, LocalDateTime.now());
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTicketId(),
                notification.getType(),
                TicketLabelResolver.notificationTypeLabel(notification.getType()),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }
}
