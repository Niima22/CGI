package com.cgi.intranet.planning.service;

import com.cgi.intranet.planning.dto.request.SaveWeeklyPlanningRequest;
import com.cgi.intranet.planning.dto.request.AssignmentLockRequest;
import com.cgi.intranet.planning.dto.request.AgentUnavailabilityRequest;
import com.cgi.intranet.planning.dto.request.GenerateWeeklyPlanningRequest;
import com.cgi.intranet.planning.dto.response.WeekendOffStatisticResponse;
import com.cgi.intranet.planning.dto.response.WeeklyPlanningResponse;

import java.time.LocalDate;
import java.util.List;

public interface PlanningGenerationService {

    WeeklyPlanningResponse generate(LocalDate weekStartDate);

    WeeklyPlanningResponse generate(GenerateWeeklyPlanningRequest request);

    WeeklyPlanningResponse save(SaveWeeklyPlanningRequest request);

    WeeklyPlanningResponse save(SaveWeeklyPlanningRequest request, String supervisorIdentity, boolean supervisor);

    WeeklyPlanningResponse validate(SaveWeeklyPlanningRequest request);

    WeeklyPlanningResponse getWeek(LocalDate weekStartDate);

    WeeklyPlanningResponse publish(Long planningWeekId);

    WeeklyPlanningResponse setAssignmentLock(
            LocalDate weekStartDate,
            AssignmentLockRequest request,
            String supervisorIdentity
    );

    WeeklyPlanningResponse setAgentUnavailability(LocalDate weekStartDate, AgentUnavailabilityRequest request);

    List<WeekendOffStatisticResponse> weekendOffStatistics(LocalDate from, LocalDate to);
}
