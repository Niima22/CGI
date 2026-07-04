package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.PlanningOffDayLock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PlanningOffDayLockRepository extends JpaRepository<PlanningOffDayLock, Long> {
    List<PlanningOffDayLock> findByPlanningWeekId(Long planningWeekId);
    Optional<PlanningOffDayLock> findByPlanningWeekIdAndAgentIdAndAssignmentDate(
            Long planningWeekId, Long agentId, LocalDate assignmentDate);
}
