package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.PlanningNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PlanningNotificationRepository extends JpaRepository<PlanningNotification, Long> {

    @Query("""
            select notification
            from PlanningNotification notification
            where notification.targetEmail is null
               or lower(notification.targetEmail) = lower(:email)
               or notification.targetRole in :roles
            order by notification.createdAt desc
            """)
    List<PlanningNotification> findVisible(
            @Param("email") String email,
            @Param("roles") Collection<String> roles,
            Pageable pageable
    );

    @Query("""
            select count(notification)
            from PlanningNotification notification
            where notification.readAt is null
              and (
                    notification.targetEmail is null
                 or lower(notification.targetEmail) = lower(:email)
                 or notification.targetRole in :roles
              )
            """)
    long countVisibleUnread(
            @Param("email") String email,
            @Param("roles") Collection<String> roles
    );
}
