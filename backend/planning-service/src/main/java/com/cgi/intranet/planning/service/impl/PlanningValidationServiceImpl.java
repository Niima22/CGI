package com.cgi.intranet.planning.service.impl;

import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;
import com.cgi.intranet.planning.entity.PlanningAgent;
import com.cgi.intranet.planning.entity.Shift;
import com.cgi.intranet.planning.enums.ProblemSeverity;
import com.cgi.intranet.planning.enums.ShiftCategory;
import com.cgi.intranet.planning.enums.ValidationMode;
import com.cgi.intranet.planning.service.PlanningValidationService;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PlanningValidationServiceImpl implements PlanningValidationService {

    private static final int TARGET_WEEKLY_HOURS = 40;
    private static final int TARGET_WORKING_DAYS = 5;
    private static final int MAX_CONSECUTIVE_DAYS = 5;
    private static final Set<String> STANDARD_SHIFT_CODES = Set.of(
            "OPEN_03_12",
            "NORMAL_05_14",
            "NORMAL_07_16",
            "NORMAL_08_17",
            "NORMAL_09_18",
            "CLOSE_12_21",
            "CLOSE_13_22"
    );
    private static final Set<String> TECHNICAL_ERROR_CODES = Set.of(
            "ASSIGNMENT_OUTSIDE_WEEK",
            "UNKNOWN_OR_INACTIVE_AGENT",
            "DUPLICATE_AGENT_DAY",
            "INVALID_SHIFT",
            "LOCKED_ASSIGNMENT_OVERWRITTEN",
            "LOCKED_OFF_DAY_OVERWRITTEN"
    );

    @Override
    public List<PlanningProblemResponse> validate(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> previousAndMonthlyHistory,
            Set<String> lockedAssignmentKeys
    ) {
        return validate(
                weekStart,
                agents,
                List.of(),
                assignments,
                previousAndMonthlyHistory,
                Map.of(),
                lockedAssignmentKeys
        );
    }

    @Override
    public List<PlanningProblemResponse> validate(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> validShifts,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> previousAndMonthlyHistory,
            Map<Long, Set<LocalDate>> unavailableDays,
            Set<String> lockedAssignmentKeys
    ) {
        return validate(
                weekStart, agents, validShifts, assignments, previousAndMonthlyHistory,
                unavailableDays, lockedAssignmentKeys, Set.of(), ValidationMode.STRICT
        );
    }

    @Override
    public List<PlanningProblemResponse> validate(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> validShifts,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> previousAndMonthlyHistory,
            Map<Long, Set<LocalDate>> unavailableDays,
            Set<String> lockedAssignmentKeys,
            Set<String> lockedOffDayKeys,
            ValidationMode mode
    ) {
        List<PlanningProblemResponse> problems = new ArrayList<>();
        validateAssignmentIntegrity(weekStart, agents, validShifts, assignments, unavailableDays, problems);
        validateCoverage(weekStart, assignments, problems);
        validateFixedSco(weekStart, agents, assignments, problems);
        validateWeeklyWork(weekStart, agents, assignments, unavailableDays, problems);
        validateConsecutiveDays(weekStart, agents, assignments, previousAndMonthlyHistory, problems);
        validateRest(weekStart, assignments, previousAndMonthlyHistory, problems);
        validateWeekendFairness(weekStart, agents, assignments, previousAndMonthlyHistory, problems);
        validatePreviousWeekRotation(weekStart, agents, assignments, previousAndMonthlyHistory, problems);
        validateTwoMonthShiftRotation(weekStart, agents, assignments, previousAndMonthlyHistory, problems);
        validateLockedAssignments(assignments, lockedAssignmentKeys, problems);
        validateLockedOffDays(assignments, lockedOffDayKeys, problems);
        if (mode == ValidationMode.SUPERVISOR_OVERRIDE) {
            return problems.stream()
                    .map(problem -> problem.severity() == ProblemSeverity.ERROR
                            && !TECHNICAL_ERROR_CODES.contains(problem.code())
                            ? new PlanningProblemResponse(
                                    ProblemSeverity.WARNING,
                                    problem.code(),
                                    problem.message(),
                                    problem.agentId(),
                                    problem.date()
                            )
                            : problem)
                    .toList();
        }
        return problems;
    }

    private void validateAssignmentIntegrity(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> validShifts,
            List<PlanningDraftAssignment> assignments,
            Map<Long, Set<LocalDate>> unavailableDays,
            List<PlanningProblemResponse> problems
    ) {
        LocalDate weekEnd = weekStart.plusDays(6);
        Set<Long> agentIds = agents.stream().map(PlanningAgent::getId).collect(Collectors.toSet());
        Map<Long, Shift> shiftsById = validShifts.stream().collect(Collectors.toMap(Shift::getId, Function.identity()));
        Set<String> agentDays = new HashSet<>();

        for (PlanningDraftAssignment assignment : assignments) {
            if (assignment.assignmentDate().isBefore(weekStart) || assignment.assignmentDate().isAfter(weekEnd)) {
                addError(problems, "ASSIGNMENT_OUTSIDE_WEEK", "Assignment date is outside the requested week.",
                        assignment.agentId(), assignment.assignmentDate());
            }
            if (!agentIds.contains(assignment.agentId())) {
                addError(problems, "UNKNOWN_OR_INACTIVE_AGENT", "Assignment references an unknown or inactive agent.",
                        assignment.agentId(), assignment.assignmentDate());
            }
            String agentDay = assignment.agentId() + "|" + assignment.assignmentDate();
            if (!agentDays.add(agentDay)) {
                addError(problems, "DUPLICATE_AGENT_DAY", "An agent cannot receive two shifts on the same day.",
                        assignment.agentId(), assignment.assignmentDate());
            }
            if (!validShifts.isEmpty()) {
                Shift shift = shiftsById.get(assignment.shiftId());
                if (shift == null
                        || !shift.getCode().equals(assignment.shiftCode())
                        || shift.getCategory() != assignment.shiftCategory()
                        || !shift.getStartTime().equals(assignment.startAt().toLocalTime())
                        || !shift.getEndTime().equals(assignment.endAt().toLocalTime())
                        || shift.getPaidHours() != assignment.paidHours()) {
                    addError(problems, "INVALID_SHIFT", "Assignment does not match an active configured shift.",
                            assignment.agentId(), assignment.assignmentDate());
                }
            }
            if (unavailableDays.getOrDefault(assignment.agentId(), Set.of()).contains(assignment.assignmentDate())) {
                addError(problems, "AGENT_UNAVAILABLE", "Agent is unavailable on the assigned date.",
                        assignment.agentId(), assignment.assignmentDate());
            }
        }
    }

    private void validateCoverage(
            LocalDate weekStart,
            List<PlanningDraftAssignment> assignments,
            List<PlanningProblemResponse> problems
    ) {
        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);
            List<PlanningDraftAssignment> day = assignments.stream()
                    .filter(item -> item.assignmentDate().equals(date))
                    .toList();
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                validateSundayCoverage(date, day, problems);
            } else {
                requireShiftCount(day, date, "OPEN_03_12", 2, problems);
                requireShiftCount(day, date, "NORMAL_05_14", 1, problems);
                requireShiftCount(day, date, "CLOSE_12_21", 1, problems);
                requireShiftCount(day, date, "CLOSE_13_22", 1, problems);
                if (day.stream().anyMatch(item -> !STANDARD_SHIFT_CODES.contains(item.shiftCode()))) {
                    addError(problems, "INVALID_WEEKDAY_SHIFT",
                            "Monday-Saturday assignments may only use the seven standard shifts.",
                            null, date);
                }
            }
        }
    }

    private void validateSundayCoverage(
            LocalDate date,
            List<PlanningDraftAssignment> day,
            List<PlanningProblemResponse> problems
    ) {
        requireShiftCount(day, date, "NORMAL_05_14", 3, problems);
        requireShiftCount(day, date, "SCO_11_20", 2, problems);
        if (day.size() != 5) {
            addError(problems, "INVALID_SUNDAY_WORKER_COUNT",
                    "Exactly 5 agents must work on Sunday; found " + day.size() + ".", null, date);
        }
        if (day.stream().anyMatch(item -> !item.shiftCode().equals("NORMAL_05_14")
                && !item.shiftCode().equals("SCO_11_20"))) {
            addError(problems, "INVALID_SUNDAY_SHIFT",
                    "Sunday only permits NORMAL_05_14 and SCO_11_20.", null, date);
        }
    }

    private void requireShiftCount(
            List<PlanningDraftAssignment> day,
            LocalDate date,
            String shiftCode,
            long expected,
            List<PlanningProblemResponse> problems
    ) {
        long actual = day.stream().filter(item -> item.shiftCode().equals(shiftCode)).count();
        if (actual != expected) {
            addError(problems, "INVALID_SHIFT_COVERAGE",
                    "Shift " + shiftCode + " requires exactly " + expected + " agent(s); found " + actual + ".",
                    null, date);
        }
    }

    private void validateWeeklyWork(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            Map<Long, Set<LocalDate>> unavailableDays,
            List<PlanningProblemResponse> problems
    ) {
        Map<Long, List<PlanningDraftAssignment>> byAgent = assignments.stream()
                .collect(Collectors.groupingBy(PlanningDraftAssignment::agentId));
        for (PlanningAgent agent : agents) {
            List<PlanningDraftAssignment> agentAssignments = byAgent.getOrDefault(agent.getId(), List.of());
            int hours = agentAssignments.stream().mapToInt(PlanningDraftAssignment::paidHours).sum();
            long workedDays = agentAssignments.stream().map(PlanningDraftAssignment::assignmentDate).distinct().count();
            int unavailable = unavailableDays.getOrDefault(agent.getId(), Set.of()).size();
            int expectedWorkingDays = Math.max(0, TARGET_WORKING_DAYS - unavailable);
            int expectedWeeklyHours = expectedWorkingDays * (TARGET_WEEKLY_HOURS / TARGET_WORKING_DAYS);
            long nonWorkingDays = 7 - workedDays;
            long expectedNonWorkingDays = 7L - expectedWorkingDays;
            if (hours != expectedWeeklyHours) {
                addError(problems, "AGENT_NOT_40H",
                        agent.getFullName() + " is scheduled for " + hours + "h instead of "
                                + expectedWeeklyHours + "h after leave/absence adjustment.",
                        agent.getId(), null);
            }
            if (workedDays != expectedWorkingDays || nonWorkingDays != expectedNonWorkingDays) {
                addError(problems, "INVALID_OFF_DAYS",
                        agent.getFullName() + " must work " + expectedWorkingDays
                                + " day(s) after leave/absence adjustment; found "
                                + workedDays + " working day(s) and " + nonWorkingDays + " non-working day(s).",
                        agent.getId(), null);
            }
        }
    }

    private void validateFixedSco(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            List<PlanningProblemResponse> problems
    ) {
        List<PlanningAgent> fixedAgents = agents.stream().filter(PlanningAgent::isFixedSco).toList();
        if (fixedAgents.size() > 1) {
            addError(problems, "INVALID_FIXED_SCO_CONFIGURATION",
                    "At most one active agent may be configured as the fixed Sunday SCO agent.",
                    null, weekStart.plusDays(6));
            return;
        }
        LocalDate sunday = weekStart.plusDays(6);
        PlanningAgent fixed = fixedAgents.isEmpty() ? null : fixedAgents.get(0);
        if (fixed != null) {
            boolean fixedAssigned = assignments.stream().anyMatch(item ->
                    item.agentId().equals(fixed.getId())
                            && item.assignmentDate().equals(sunday)
                            && item.shiftCode().equals("SCO_11_20"));
            if (!fixedAssigned) {
                addError(problems, "FIXED_SCO_AGENT_MISSING",
                        fixed.getFullName() + " must be assigned to SCO every Sunday.",
                        fixed.getId(), sunday);
            }
        }
        long nonFixedSco = assignments.stream()
                .filter(item -> item.assignmentDate().equals(sunday))
                .filter(item -> item.shiftCode().equals("SCO_11_20"))
                .filter(item -> fixed == null || !item.agentId().equals(fixed.getId()))
                .count();
        long expectedNonFixedSco = fixed == null ? 2 : 1;
        if (nonFixedSco != expectedNonFixedSco) {
            addError(problems, "INVALID_ROTATING_SCO",
                    fixed == null
                            ? "Exactly two rotating SCO agents are required when no fixed SCO agent is configured."
                            : "Exactly one rotating SCO agent, different from the fixed agent, is required.",
                    null, sunday);
        }
    }

    private void validateConsecutiveDays(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> history,
            List<PlanningProblemResponse> problems
    ) {
        LocalDate rangeStart = weekStart.minusDays(6);
        LocalDate rangeEnd = weekStart.plusDays(6);
        for (PlanningAgent agent : agents) {
            Set<LocalDate> worked = new HashSet<>();
            history.stream()
                    .filter(item -> item.agentId().equals(agent.getId()))
                    .map(PlanningDraftAssignment::assignmentDate)
                    .filter(date -> !date.isBefore(rangeStart) && date.isBefore(weekStart))
                    .forEach(worked::add);
            assignments.stream()
                    .filter(item -> item.agentId().equals(agent.getId()))
                    .map(PlanningDraftAssignment::assignmentDate)
                    .forEach(worked::add);

            int consecutive = 0;
            for (LocalDate date = rangeStart; !date.isAfter(rangeEnd); date = date.plusDays(1)) {
                consecutive = worked.contains(date) ? consecutive + 1 : 0;
                if (consecutive > MAX_CONSECUTIVE_DAYS && !date.isBefore(weekStart)) {
                    addError(problems, "MAX_CONSECUTIVE_DAYS_EXCEEDED",
                            agent.getFullName() + " would work more than 5 consecutive days, including previous-week history.",
                            agent.getId(), date);
                    break;
                }
            }
        }
    }

    private void validateRest(
            LocalDate weekStart,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> history,
            List<PlanningProblemResponse> problems
    ) {
        List<PlanningDraftAssignment> all = new ArrayList<>(history);
        all.addAll(assignments);
        Map<Long, List<PlanningDraftAssignment>> byAgent = all.stream()
                .collect(Collectors.groupingBy(PlanningDraftAssignment::agentId));
        byAgent.forEach((agentId, agentAssignments) -> {
            List<PlanningDraftAssignment> sorted = agentAssignments.stream()
                    .sorted(Comparator.comparing(PlanningDraftAssignment::startAt))
                    .toList();
            for (int i = 1; i < sorted.size(); i++) {
                PlanningDraftAssignment previous = sorted.get(i - 1);
                PlanningDraftAssignment current = sorted.get(i);
                if (previous.assignmentDate().equals(current.assignmentDate())) {
                    continue;
                }
                long restHours = Duration.between(previous.endAt(), current.startAt()).toHours();
                if (restHours < 10) {
                    String message = previous.assignmentDate().isBefore(weekStart)
                            && !current.assignmentDate().isBefore(weekStart)
                            ? "Agent has only " + restHours + "h rest before " + current.shiftCode()
                            + " because of previous-week shift " + previous.shiftCode()
                            + " on " + previous.assignmentDate()
                            + ". Regenerate the previous week or save with supervisor override."
                            : "Agent has only " + restHours + "h rest before " + current.shiftCode() + ".";
                    addError(problems, "REST_LESS_THAN_10H",
                            message,
                            agentId, current.assignmentDate());
                }
            }
        });
    }

    private void validateWeekendFairness(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> history,
            List<PlanningProblemResponse> problems
    ) {
        LocalDate monthStart = YearMonth.from(weekStart).atDay(1);
        LocalDate monthEnd = YearMonth.from(weekStart).atEndOfMonth();
        List<PlanningDraftAssignment> all = new ArrayList<>(history);
        all.addAll(assignments);
        for (PlanningAgent agent : agents) {
            if (countFullWeekendOff(agent.getId(), monthStart, monthEnd, all) == 0) {
                problems.add(new PlanningProblemResponse(
                        ProblemSeverity.WARNING,
                        "NO_FULL_WEEKEND_OFF",
                        agent.getFullName() + " has no full weekend OFF in this month.",
                        agent.getId(),
                        null
                ));
            }
        }
    }

    private void validatePreviousWeekRotation(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> history,
            List<PlanningProblemResponse> problems
    ) {
        LocalDate previousStart = weekStart.minusDays(7);
        LocalDate previousEnd = weekStart.minusDays(1);
        Map<Long, PlanningAgent> agentMap = agents.stream().collect(Collectors.toMap(PlanningAgent::getId, Function.identity()));
        for (PlanningDraftAssignment assignment : assignments) {
            boolean repeatedCategory = history.stream()
                    .anyMatch(previous -> previous.agentId().equals(assignment.agentId())
                            && !previous.assignmentDate().isBefore(previousStart)
                            && !previous.assignmentDate().isAfter(previousEnd)
                            && previous.shiftCategory() == assignment.shiftCategory());
            if (repeatedCategory) {
                String name = agentMap.getOrDefault(
                        assignment.agentId(),
                        new PlanningAgent("Agent " + assignment.agentId(), null)
                ).getFullName();
                problems.add(new PlanningProblemResponse(
                        ProblemSeverity.WARNING,
                        "REPEATED_WEEKLY_ROTATION",
                        name + " has " + assignment.shiftCategory() + " in consecutive weeks.",
                        assignment.agentId(),
                        assignment.assignmentDate().toString()
                ));
            }
        }
    }

    private void validateLockedAssignments(
            List<PlanningDraftAssignment> assignments,
            Set<String> lockedAssignmentKeys,
            List<PlanningProblemResponse> problems
    ) {
        Set<String> currentKeys = assignments.stream().map(PlanningDraftAssignment::key).collect(Collectors.toSet());
        for (String lockedKey : lockedAssignmentKeys) {
            if (!currentKeys.contains(lockedKey)) {
                problems.add(new PlanningProblemResponse(
                        ProblemSeverity.ERROR,
                        "LOCKED_ASSIGNMENT_OVERWRITTEN",
                        "A locked assignment was removed or overwritten: " + lockedKey,
                        null,
                        null
                ));
            }
        }
    }

    private void validateLockedOffDays(
            List<PlanningDraftAssignment> assignments,
            Set<String> lockedOffDayKeys,
            List<PlanningProblemResponse> problems
    ) {
        Set<String> workedAgentDays = assignments.stream()
                .map(item -> item.agentId() + "|" + item.assignmentDate())
                .collect(Collectors.toSet());
        for (String lockedOffDayKey : lockedOffDayKeys) {
            if (workedAgentDays.contains(lockedOffDayKey)) {
                problems.add(new PlanningProblemResponse(
                        ProblemSeverity.ERROR,
                        "LOCKED_OFF_DAY_OVERWRITTEN",
                        "A locked OFF day received a working assignment: " + lockedOffDayKey,
                        null,
                        null
                ));
            }
        }
    }

    private void validateTwoMonthShiftRotation(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<PlanningDraftAssignment> assignments,
            List<PlanningDraftAssignment> history,
            List<PlanningProblemResponse> problems
    ) {
        LocalDate windowStart = weekStart.minusWeeks(7);
        List<PlanningDraftAssignment> rolling = new ArrayList<>(history);
        rolling.addAll(assignments);
        boolean hasFullWindow = rolling.stream()
                .map(PlanningDraftAssignment::assignmentDate)
                .min(LocalDate::compareTo)
                .map(first -> !first.isAfter(windowStart))
                .orElse(false);
        if (!hasFullWindow) {
            return;
        }
        for (PlanningAgent agent : agents) {
            Set<String> covered = rolling.stream()
                    .filter(item -> item.agentId().equals(agent.getId()))
                    .filter(item -> !item.assignmentDate().isBefore(windowStart))
                    .map(PlanningDraftAssignment::shiftCode)
                    .filter(STANDARD_SHIFT_CODES::contains)
                    .collect(Collectors.toSet());
            Set<String> missing = new HashSet<>(STANDARD_SHIFT_CODES);
            missing.removeAll(covered);
            if (!missing.isEmpty()) {
                problems.add(new PlanningProblemResponse(
                        ProblemSeverity.WARNING,
                        "TWO_MONTH_SHIFT_ROTATION_GAP",
                        agent.getFullName() + " has not covered all seven standard shifts in the rolling two-month window. Missing: "
                                + missing.stream().sorted().collect(Collectors.joining(", ")) + ".",
                        agent.getId(),
                        null
                ));
            }
        }
    }

    private void addError(
            List<PlanningProblemResponse> problems,
            String code,
            String message,
            Long agentId,
            LocalDate date
    ) {
        problems.add(new PlanningProblemResponse(
                ProblemSeverity.ERROR,
                code,
                message,
                agentId,
                date == null ? null : date.toString()
        ));
    }

    public static long countFullWeekendOff(
            Long agentId,
            LocalDate monthStart,
            LocalDate monthEnd,
            List<PlanningDraftAssignment> allAssignments
    ) {
        Set<LocalDate> workedDays = allAssignments.stream()
                .filter(item -> item.agentId().equals(agentId))
                .map(PlanningDraftAssignment::assignmentDate)
                .collect(Collectors.toSet());
        long count = 0;
        for (LocalDate date = monthStart; !date.isAfter(monthEnd.minusDays(1)); date = date.plusDays(1)) {
            if (date.getDayOfWeek().getValue() == 6
                    && !workedDays.contains(date)
                    && !workedDays.contains(date.plusDays(1))) {
                count++;
            }
        }
        return count;
    }
}
