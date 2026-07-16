package com.cgi.intranet.planning.service.impl;

import com.cgi.intranet.planning.dto.response.PlanningNotificationResponse;
import com.cgi.intranet.planning.entity.PlanningNotification;
import com.cgi.intranet.planning.repository.PlanningNotificationRepository;
import com.cgi.intranet.planning.service.PlanningNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
public class LoggingPlanningNotificationService implements PlanningNotificationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingPlanningNotificationService.class);

    private final PlanningNotificationRepository notificationRepository;

    public LoggingPlanningNotificationService(PlanningNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    @Transactional
    public void planningPublished(Long planningWeekId, LocalDate weekStartDate, LocalDate weekEndDate) {
        notificationRepository.save(new PlanningNotification(
                "PLANNING_PUBLISHED",
                "Planning publie",
                "Le planning du " + weekStartDate + " au " + weekEndDate + " est disponible.",
                "/planning-view",
                null,
                null
        ));
        LOGGER.info(
                "Planning notification hook: planning week {} published for {} to {}.",
                planningWeekId,
                weekStartDate,
                weekEndDate
        );
    }

    @Override
    @Transactional
    public void requestStatusChanged(String requestType, Long requestId, String status) {
        notificationRepository.save(new PlanningNotification(
                "REQUEST_STATUS_CHANGED",
                "Demande mise a jour",
                "La demande " + requestType + " #" + requestId + " est maintenant " + status + ".",
                "/planning-view",
                null,
                null
        ));
        LOGGER.info(
                "Planning notification hook: {} request {} changed to {}.",
                requestType,
                requestId,
                status
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlanningNotificationResponse> visibleNotifications(String email, Set<String> roles, int limit) {
        return notificationRepository.findVisible(safeEmail(email), safeRoles(roles), PageRequest.of(0, limit)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(String email, Set<String> roles) {
        return notificationRepository.countVisibleUnread(safeEmail(email), safeRoles(roles));
    }

    @Override
    @Transactional
    public void markRead(Long notificationId, String email, Set<String> roles) {
        Set<Long> visibleIds = notificationRepository.findVisible(safeEmail(email), safeRoles(roles), PageRequest.of(0, 200))
                .stream()
                .map(PlanningNotification::getId)
                .collect(java.util.stream.Collectors.toSet());
        if (!visibleIds.contains(notificationId)) {
            throw new IllegalArgumentException("Notification " + notificationId + " was not found.");
        }
        PlanningNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification " + notificationId + " was not found."));
        notification.markRead();
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllRead(String email, Set<String> roles) {
        notificationRepository.findVisible(safeEmail(email), safeRoles(roles), PageRequest.of(0, 200))
                .forEach(notification -> {
                    notification.markRead();
                    notificationRepository.save(notification);
                });
    }

    private PlanningNotificationResponse toResponse(PlanningNotification notification) {
        return new PlanningNotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getActionUrl(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }

    private String safeEmail(String email) {
        return email == null || email.isBlank() ? "__anonymous__" : email.trim();
    }

    private Set<String> safeRoles(Set<String> roles) {
        return roles == null || roles.isEmpty() ? Set.of("__none__") : roles;
    }
}
