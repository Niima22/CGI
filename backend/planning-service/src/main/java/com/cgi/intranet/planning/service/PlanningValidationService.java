package com.cgi.intranet.planning.service;

import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;
import com.cgi.intranet.planning.entity.PlanningAgent;
import com.cgi.intranet.planning.entity.Shift;
import com.cgi.intranet.planning.enums.ValidationMode;
import com.cgi.intranet.planning.service.impl.PlanningDraftAssignment;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

public interface PlanningValidationService {

    List<PlanningProblemResponse> validate(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> previousAndMonthlyHistory,
            Set<String> lockedAssignmentKeys
    );

    List<PlanningProblemResponse> validate(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> validShifts,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> previousAndMonthlyHistory,
            Map<Long, Set<LocalDate>> unavailableDays,
            Set<String> lockedAssignmentKeys
    );

    List<PlanningProblemResponse> validate(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> validShifts,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> previousAndMonthlyHistory,
            Map<Long, Set<LocalDate>> unavailableDays,
            Set<String> lockedAssignmentKeys,
            Set<String> lockedOffDayKeys,
            ValidationMode mode
    );
}
