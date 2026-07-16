package com.cgi.intranet.planning.service;

import com.cgi.intranet.planning.dto.response.PlanningNotificationResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public interface PlanningNotificationService {

    void planningPublished(Long planningWeekId, LocalDate weekStartDate, LocalDate weekEndDate);

    void requestStatusChanged(String requestType, Long requestId, String status);

    List<PlanningNotificationResponse> visibleNotifications(String email, Set<String> roles, int limit);

    long unreadCount(String email, Set<String> roles);

    void markRead(Long notificationId, String email, Set<String> roles);

    void markAllRead(String email, Set<String> roles);
}
