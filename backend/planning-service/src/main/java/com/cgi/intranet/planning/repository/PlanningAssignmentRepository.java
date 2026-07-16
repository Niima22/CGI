package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.PlanningAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PlanningAssignmentRepository extends JpaRepository<PlanningAssignment, Long> {

    List<PlanningAssignment> findByAssignmentDateBetween(LocalDate start, LocalDate end);

    List<PlanningAssignment> findByPlanningWeekId(Long planningWeekId);

    void deleteByPlanningWeekIdAndLockedFalse(Long planningWeekId);

    Optional<PlanningAssignment> findByPlanningWeekIdAndAgentIdAndAssignmentDate(
            Long planningWeekId, Long agentId, LocalDate assignmentDate);
}
