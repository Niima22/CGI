package com.cgi.intranet.planning.service;

import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;
import com.cgi.intranet.planning.entity.PlanningAgent;
import com.cgi.intranet.planning.entity.Shift;
import com.cgi.intranet.planning.enums.ShiftCategory;
import com.cgi.intranet.planning.enums.ValidationMode;
import com.cgi.intranet.planning.service.impl.PlanningDraftAssignment;
import com.cgi.intranet.planning.service.impl.PlanningValidationServiceImpl;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PlanningValidationServiceImplTest {

    private final PlanningValidationService validator = new PlanningValidationServiceImpl();

    @Test
    void detectsTenHourRestViolation() {
        PlanningAgent agent = agent(1L, "Agent 1");
        Shift opening = shift(1L, "OPEN_03_12", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0));
        Shift late = shift(2L, "CLOSE_13_22", ShiftCategory.CLOSING, LocalTime.of(13, 0), LocalTime.of(22, 0));
        LocalDate monday = LocalDate.of(2026, 6, 15);

        List<PlanningProblemResponse> problems = validator.validate(
                monday,
                List.of(agent),
                List.of(PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, monday, false, true)),
                List.of(PlanningDraftAssignment.of(null, 1L, "Agent 1", late, monday.minusDays(1), false, true)),
                Set.of()
        );

        assertThat(problems).anyMatch(problem -> problem.code().equals("REST_LESS_THAN_10H"));
    }

    @Test
    void detectsWeekendFairnessGap() {
        PlanningAgent agent = agent(1L, "Agent 1");
        Shift opening = shift(1L, "OPEN_03_12", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 15);
        List<PlanningDraftAssignment> weekendWork = List.of(
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 6), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 7), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 13), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 14), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 20), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 21), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 27), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, LocalDate.of(2026, 6, 28), false, true)
        );

        List<PlanningProblemResponse> problems = validator.validate(weekStart, List.of(agent), List.of(), weekendWork, Set.of());

        assertThat(problems).anyMatch(problem -> problem.code().equals("NO_FULL_WEEKEND_OFF"));
    }

    @Test
    void detectsPreviousWeekRotation() {
        PlanningAgent agent = agent(1L, "Agent 1");
        Shift opening = shift(1L, "OPEN_03_12", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 15);

        List<PlanningProblemResponse> problems = validator.validate(
                weekStart,
                List.of(agent),
                List.of(PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart, false, true)),
                List.of(PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart.minusDays(7), false, true)),
                Set.of()
        );

        assertThat(problems).anyMatch(problem -> problem.code().equals("REPEATED_WEEKLY_ROTATION"));
    }

    @Test
    void detectsFortyHourMismatch() {
        PlanningAgent agent = agent(1L, "Agent 1");
        Shift opening = shift(1L, "OPEN_03_12", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 15);

        List<PlanningProblemResponse> problems = validator.validate(
                weekStart,
                List.of(agent),
                List.of(
                        PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart, false, true),
                        PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart.plusDays(1), false, true),
                        PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart.plusDays(2), false, true),
                        PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart.plusDays(3), false, true)
                ),
                List.of(),
                Set.of()
        );

        assertThat(problems).anyMatch(problem -> problem.code().equals("AGENT_NOT_40H"));
    }

    @Test
    void detectsDuplicateAssignmentOnSameDay() {
        PlanningAgent agent = agent(1L, "Agent 1");
        Shift opening = shift(1L, "OPEN_03_12", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0));
        Shift normal = shift(2L, "NORMAL_09_18", ShiftCategory.NORMAL, LocalTime.of(9, 0), LocalTime.of(18, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 15);

        List<PlanningProblemResponse> problems = validator.validate(
                weekStart,
                List.of(agent),
                List.of(
                        PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart, false, true),
                        PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart, false, true)
                ),
                List.of(),
                Set.of()
        );

        assertThat(problems).anyMatch(problem -> problem.code().equals("DUPLICATE_AGENT_DAY"));
    }

    @Test
    void detectsConsecutiveDaysAcrossPreviousWeekBoundary() {
        PlanningAgent agent = agent(1L, "Agent 1");
        Shift normal = shift(1L, "NORMAL_09_18", ShiftCategory.NORMAL, LocalTime.of(9, 0), LocalTime.of(18, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 15);
        List<PlanningDraftAssignment> history = List.of(
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart.minusDays(3), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart.minusDays(2), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart.minusDays(1), false, true)
        );
        List<PlanningDraftAssignment> current = List.of(
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart, false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart.plusDays(1), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart.plusDays(2), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart.plusDays(4), false, true),
                PlanningDraftAssignment.of(null, 1L, "Agent 1", normal, weekStart.plusDays(6), false, true)
        );

        List<PlanningProblemResponse> problems = validator.validate(
                weekStart,
                List.of(agent),
                current,
                history,
                Set.of()
        );

        assertThat(problems).anyMatch(problem -> problem.code().equals("MAX_CONSECUTIVE_DAYS_EXCEEDED"));
    }

    @Test
    void rejectsIntermediateOpeningAndClosingShiftsOnSunday() {
        PlanningAgent fixed = agent(1L, "Fixed SCO");
        fixed.setFixedSco(true);
        PlanningAgent second = agent(2L, "Agent 2");
        Shift intermediate = shift(1L, "NORMAL_08_17", ShiftCategory.NORMAL, LocalTime.of(8, 0), LocalTime.of(17, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 22);

        List<PlanningProblemResponse> problems = validator.validate(
                weekStart,
                List.of(fixed, second),
                List.of(PlanningDraftAssignment.of(
                        null, second.getId(), second.getFullName(), intermediate,
                        weekStart.plusDays(6), false, false
                )),
                List.of(),
                Set.of()
        );

        assertThat(problems).anyMatch(problem -> problem.code().equals("INVALID_SUNDAY_SHIFT"));
    }

    @Test
    void rejectsSundayScoFollowedByMondayOpeningAcrossWeekBoundary() {
        PlanningAgent agent = agent(1L, "Agent 1");
        agent.setFixedSco(true);
        Shift opening = shift(1L, "OPEN_03_12", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0));
        Shift sco = shift(2L, "SCO_11_20", ShiftCategory.SCO, LocalTime.of(11, 0), LocalTime.of(20, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 22);

        List<PlanningProblemResponse> problems = validator.validate(
                weekStart,
                List.of(agent),
                List.of(PlanningDraftAssignment.of(null, 1L, "Agent 1", opening, weekStart, false, true)),
                List.of(PlanningDraftAssignment.of(null, 1L, "Agent 1", sco, weekStart.minusDays(1), false, true)),
                Set.of()
        );

        assertThat(problems).anyMatch(problem -> problem.code().equals("REST_LESS_THAN_10H"));
    }

    @Test
    void supervisorOverrideConvertsBusinessRulesToWarningsButKeepsIntegrityErrors() {
        PlanningAgent agent = agent(1L, "Agent 1");
        Shift opening = shift(1L, "OPEN_03_12", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0));
        LocalDate weekStart = LocalDate.of(2026, 6, 22);
        PlanningDraftAssignment invalidAgent = PlanningDraftAssignment.of(
                null, 999L, "Missing", opening, weekStart, false, false);

        List<PlanningProblemResponse> problems = validator.validate(
                weekStart,
                List.of(agent),
                List.of(opening),
                List.of(invalidAgent),
                List.of(),
                Map.of(),
                Set.of(),
                Set.of(),
                ValidationMode.SUPERVISOR_OVERRIDE
        );

        assertThat(problems).anyMatch(problem ->
                problem.code().equals("INVALID_SHIFT_COVERAGE")
                        && problem.severity() == com.cgi.intranet.planning.enums.ProblemSeverity.WARNING);
        assertThat(problems).anyMatch(problem ->
                problem.code().equals("UNKNOWN_OR_INACTIVE_AGENT")
                        && problem.severity() == com.cgi.intranet.planning.enums.ProblemSeverity.ERROR);
    }

    private PlanningAgent agent(Long id, String name) {
        PlanningAgent agent = new PlanningAgent(name, name.toLowerCase().replace(" ", "") + "@test.com");
        setId(agent, id);
        return agent;
    }

    private Shift shift(Long id, String code, ShiftCategory category, LocalTime start, LocalTime end) {
        Shift shift = new Shift(code, code, category, start, end);
        setId(shift, id);
        return shift;
    }

    private void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
