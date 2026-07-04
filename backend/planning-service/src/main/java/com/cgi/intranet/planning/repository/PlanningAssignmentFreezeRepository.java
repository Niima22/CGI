package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.PlanningAssignmentFreeze;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PlanningAssignmentFreezeRepository extends JpaRepository<PlanningAssignmentFreeze, Long> {

    List<PlanningAssignmentFreeze> findByActiveTrueAndStartDateLessThanEqual(LocalDate weekEnd);

    List<PlanningAssignmentFreeze> findByAgentIdAndDayOfWeekAndActiveTrue(Long agentId, int dayOfWeek);
}
