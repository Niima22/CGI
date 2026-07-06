package com.cgi.intranet.ticket.repository;

import com.cgi.intranet.ticket.entity.Notification;
import com.cgi.intranet.ticket.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDescIdDesc(Long recipientUserId);

    long countByRecipientUserIdAndReadFalse(Long recipientUserId);

    Optional<Notification> findByIdAndRecipientUserId(Long id, Long recipientUserId);

    boolean existsByRecipientUserIdAndTicketIdAndType(Long recipientUserId, Long ticketId, NotificationType type);

    @Modifying
    @Query("""
            update Notification notification
            set notification.read = true,
                notification.readAt = :readAt
            where notification.recipientUserId = :recipientUserId
              and notification.read = false
            """)
    int markAllAsRead(@Param("recipientUserId") Long recipientUserId, @Param("readAt") LocalDateTime readAt);
}
