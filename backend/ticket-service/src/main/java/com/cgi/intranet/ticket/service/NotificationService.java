package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.dto.response.NotificationResponse;
import com.cgi.intranet.ticket.dto.response.UnreadNotificationCountResponse;
import com.cgi.intranet.ticket.enums.NotificationType;

import java.util.Collection;
import java.util.List;

public interface NotificationService {

    void createNotificationIfAbsent(
            Long recipientUserId,
            Long ticketId,
            NotificationType type,
            String title,
            String message
    );

    void createNotificationsIfAbsent(
            Collection<Long> recipientUserIds,
            Long ticketId,
            NotificationType type,
            String title,
            String message
    );

    List<NotificationResponse> getCurrentUserNotifications();

    UnreadNotificationCountResponse getUnreadCount();

    NotificationResponse markNotificationRead(Long id);

    void markAllNotificationsRead();
}
