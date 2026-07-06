package com.cgi.intranet.ticket.controller;

import com.cgi.intranet.ticket.dto.response.NotificationResponse;
import com.cgi.intranet.ticket.dto.response.UnreadNotificationCountResponse;
import com.cgi.intranet.ticket.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        return ResponseEntity.ok(notificationService.getCurrentUserNotifications());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadNotificationCountResponse> getUnreadCount() {
        return ResponseEntity.ok(notificationService.getUnreadCount());
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markNotificationRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markNotificationRead(id));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllNotificationsRead() {
        notificationService.markAllNotificationsRead();
        return ResponseEntity.noContent().build();
    }
}
