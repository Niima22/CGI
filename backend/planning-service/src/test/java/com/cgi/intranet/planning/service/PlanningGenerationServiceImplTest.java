package com.cgi.intranet.planning.service;

import com.cgi.intranet.planning.dto.request.AssignmentDraftRequest;
import com.cgi.intranet.planning.dto.request.AssignmentLockRequest;
import com.cgi.intranet.planning.dto.request.AgentUnavailabilityRequest;
import com.cgi.intranet.planning.dto.request.SaveWeeklyPlanningRequest;
import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;
import com.cgi.intranet.planning.dto.response.WeeklyPlanningResponse;
import com.cgi.intranet.planning.entity.AgentUnavailability;
import com.cgi.intranet.planning.entity.PlanningAgent;
import com.cgi.intranet.planning.entity.PlanningAssignment;
import com.cgi.intranet.planning.entity.PlanningWeek;
import com.cgi.intranet.planning.entity.Shift;
import com.cgi.intranet.planning.enums.PlanningStatus;
import com.cgi.intranet.planning.enums.ProblemSeverity;
import com.cgi.intranet.planning.enums.ShiftCategory;
import com.cgi.intranet.planning.enums.ValidationMode;
import com.cgi.intranet.planning.exception.PlanningValidationException;
import com.cgi.intranet.planning.repository.AgentUnavailabilityRepository;
import com.cgi.intranet.planning.repository.PlanningAgentRepository;
import com.cgi.intranet.planning.repository.PlanningAssignmentFreezeRepository;
import com.cgi.intranet.planning.repository.PlanningAssignmentRepository;
import com.cgi.intranet.planning.repository.PlanningOffDayLockRepository;
import com.cgi.intranet.planning.repository.PlanningOverrideAuditRepository;
import com.cgi.intranet.planning.repository.PlanningWeekRepository;
import com.cgi.intranet.planning.repository.ShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:planning-generation;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "eureka.client.enabled=false"
})
class PlanningGenerationServiceImplTest {

    @Autowired
    private PlanningGenerationService planningGenerationService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private PlanningAgentRepository agentRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private AgentUnavailabilityRepository unavailabilityRepository;

    @Autowired
    private PlanningWeekRepository weekRepository;

    @Autowired
    private PlanningAssignmentRepository assignmentRepository;

    @Autowired
    private PlanningAssignmentFreezeRepository assignmentFreezeRepository;

    @Autowired
    private PlanningOffDayLockRepository offDayLockRepository;

    @Autowired
    private PlanningOverrideAuditRepository overrideAuditRepository;

    @BeforeEach
    void setUp() {
        overrideAuditRepository.deleteAll();
        offDayLockRepository.deleteAll();
        assignmentFreezeRepository.deleteAll();
        assignmentRepository.deleteAll();
        weekRepository.deleteAll();
        unavailabilityRepository.deleteAll();
        agentRepository.deleteAll();
        shiftRepository.deleteAll();

        shiftRepository.save(new Shift("OPEN_03_12", "Opening 03:00-12:00", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0)));
        shiftRepository.save(new Shift("NORMAL_05_14", "Normal 05:00-14:00", ShiftCategory.NORMAL, LocalTime.of(5, 0), LocalTime.of(14, 0)));
        shiftRepository.save(new Shift("NORMAL_07_16", "Normal 07:00-16:00", ShiftCategory.NORMAL, LocalTime.of(7, 0), LocalTime.of(16, 0)));
        shiftRepository.save(new Shift("NORMAL_08_17", "Normal 08:00-17:00", ShiftCategory.NORMAL, LocalTime.of(8, 0), LocalTime.of(17, 0)));
        shiftRepository.save(new Shift("NORMAL_09_18", "Normal 09:00-18:00", ShiftCategory.NORMAL, LocalTime.of(9, 0), LocalTime.of(18, 0)));
        shiftRepository.save(new Shift("CLOSE_12_21", "Closing 12:00-21:00", ShiftCategory.CLOSING, LocalTime.of(12, 0), LocalTime.of(21, 0)));
        shiftRepository.save(new Shift("CLOSE_13_22", "Late closing 13:00-22:00", ShiftCategory.CLOSING, LocalTime.of(13, 0), LocalTime.of(22, 0)));
        shiftRepository.save(new Shift("SCO_11_20", "SCO 11:00-20:00", ShiftCategory.SCO, LocalTime.of(11, 0), LocalTime.of(20, 0)));

        for (int i = 1; i <= 12; i++) {
            PlanningAgent agent = new PlanningAgent("Agent " + i, "agent" + i + "@test.com");
            agent.setFixedSco(i == 1);
            agentRepository.save(agent);
        }
    }

    @Test
    void generatesValidWeekCoverageWithoutBlockingErrors() {
        WeeklyPlanningResponse response = planningGenerationService.generate(LocalDate.of(2026, 6, 15));

        assertThat(response.assignments()).hasSize(60);
        assertThat(response.problems())
                .extracting(PlanningProblemResponse::severity)
                .doesNotContain(ProblemSeverity.ERROR);
        assertThat(response.agentSummaries())
                .allSatisfy(summary -> {
                    assertThat(summary.assignedHours()).isEqualTo(40);
                    assertThat(summary.offDays()).isEqualTo(2);
                });
        for (int day = 0; day < 6; day++) {
            String date = LocalDate.of(2026, 6, 15).plusDays(day).toString();
            assertShiftCount(response, date, "OPEN_03_12", 2);
            assertShiftCount(response, date, "NORMAL_05_14", 1);
            assertShiftCount(response, date, "CLOSE_12_21", 1);
            assertShiftCount(response, date, "CLOSE_13_22", 1);
        }
        String sunday = LocalDate.of(2026, 6, 21).toString();
        assertShiftCount(response, sunday, "NORMAL_05_14", 3);
        assertShiftCount(response, sunday, "SCO_11_20", 2);
        assertThat(response.assignments()).filteredOn(item -> item.assignmentDate().equals(sunday)).hasSize(5);
        assertThat(response.assignments())
                .filteredOn(item -> item.assignmentDate().equals(sunday))
                .allMatch(item -> item.shiftCode().equals("NORMAL_05_14")
                        || item.shiftCode().equals("SCO_11_20"));
    }

    @Test
    void reportsInsufficientAgents() {
        agentRepository.deleteAll();
        for (int i = 1; i <= 3; i++) {
            agentRepository.save(new PlanningAgent("Tiny Agent " + i, "tiny" + i + "@test.com"));
        }

        WeeklyPlanningResponse response = planningGenerationService.generate(LocalDate.of(2026, 6, 15));

        assertThat(response.problems())
                .anyMatch(problem -> problem.code().equals("INVALID_AGENT_COUNT"));
    }

    @Test
    void respectsUnavailableAgent() {
        PlanningAgent unavailable = agentRepository.findByActiveTrueOrderByFullName().get(0);
        LocalDate monday = LocalDate.of(2026, 6, 15);
        unavailabilityRepository.save(new AgentUnavailability(unavailable.getId(), monday, "Approved absence"));

        WeeklyPlanningResponse response = planningGenerationService.generate(monday);

        assertThat(response.assignments())
                .noneMatch(item -> item.agentId().equals(unavailable.getId()) && item.assignmentDate().equals(monday.toString()));
    }

    @Test
    void supervisorCanMarkAgentAbsentFromPlanningGrid() {
        PlanningAgent unavailable = agentRepository.findByActiveTrueOrderByFullName().get(0);
        LocalDate monday = LocalDate.of(2026, 6, 15);

        WeeklyPlanningResponse response = planningGenerationService.setAgentUnavailability(
                monday,
                new AgentUnavailabilityRequest(unavailable.getId(), monday.plusDays(1), "ABSENT")
        );

        assertThat(response.unavailableDays())
                .anyMatch(item -> item.agentId().equals(unavailable.getId())
                        && item.date().equals(monday.plusDays(1).toString())
                        && item.reason().equals("ABSENT"));
        assertThat(response.assignments())
                .noneMatch(item -> item.agentId().equals(unavailable.getId())
                        && item.assignmentDate().equals(monday.plusDays(1).toString()));
    }

    @Test
    void teleworkKeepsExistingShiftOnPlanningGrid() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
        WeeklyPlanningResponse saved = planningGenerationService.save(saveRequest(monday, generated));
        var assignment = saved.assignments().get(0);
        LocalDate assignmentDate = LocalDate.parse(assignment.assignmentDate());

        WeeklyPlanningResponse response = planningGenerationService.setAgentUnavailability(
                monday,
                new AgentUnavailabilityRequest(assignment.agentId(), assignmentDate, "TELETRAVAIL")
        );

        assertThat(response.unavailableDays())
                .anyMatch(item -> item.agentId().equals(assignment.agentId())
                        && item.date().equals(assignment.assignmentDate())
                        && item.reason().equals("TELETRAVAIL"));
        assertThat(response.assignments())
                .anyMatch(item -> item.agentId().equals(assignment.agentId())
                        && item.assignmentDate().equals(assignment.assignmentDate())
                        && item.shiftCode().equals(assignment.shiftCode()));
    }

    @Test
    void preservesLockedAssignmentDuringGeneration() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        PlanningWeek week = weekRepository.save(new PlanningWeek(monday, PlanningStatus.DRAFT));
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        Shift shift = shiftRepository.findFirstByCategoryAndActiveTrueOrderByStartTime(ShiftCategory.OPENING).orElseThrow();
        assignmentRepository.save(new PlanningAssignment(week.getId(), agent.getId(), shift, monday, true, false));

        WeeklyPlanningResponse response = planningGenerationService.generate(monday);

        assertThat(response.assignments())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(monday.toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked());
    }

    @Test
    void preservesLockedOffDayDuringRegeneration() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
        WeeklyPlanningResponse saved = planningGenerationService.save(saveRequest(monday, generated));
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        Set<LocalDate> worked = saved.assignments().stream()
                .filter(item -> item.agentId().equals(agent.getId()))
                .map(item -> LocalDate.parse(item.assignmentDate()))
                .collect(Collectors.toSet());
        LocalDate offDay = java.util.stream.IntStream.range(0, 7)
                .mapToObj(monday::plusDays)
                .filter(day -> !worked.contains(day))
                .findFirst()
                .orElseThrow();

        planningGenerationService.setAssignmentLock(
                monday,
                new AssignmentLockRequest(agent.getId(), offDay, true),
                "manager@test.com"
        );
        WeeklyPlanningResponse regenerated = planningGenerationService.generate(monday);

        assertThat(regenerated.lockedOffDays()).contains(agent.getId() + "|" + offDay);
        assertThat(regenerated.assignments()).noneMatch(item ->
                item.agentId().equals(agent.getId()) && item.assignmentDate().equals(offDay.toString()));
    }

    @Test
    void appliesLockedAssignmentToFollowingWeeks() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        Shift opening = shiftRepository.findFirstByCategoryAndActiveTrueOrderByStartTime(ShiftCategory.OPENING).orElseThrow();

        planningGenerationService.setAssignmentLock(
                monday,
                new AssignmentLockRequest(agent.getId(), monday, opening.getId(), true),
                "manager@test.com"
        );

        WeeklyPlanningResponse nextWeek = planningGenerationService.generate(monday.plusWeeks(1));

        assertThat(generated.assignments()).isNotEmpty();
        assertThat(nextWeek.assignments())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(monday.plusWeeks(1).toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked());
    }

    @Test
    void copiesPreviouslyLockedWholeWeekPatternToNextGeneratedWeek() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 8);
        LocalDate nextMonday = firstMonday.plusWeeks(1);
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        Map<String, Shift> shifts = shiftRepository.findByActiveTrueOrderByStartTime().stream()
                .collect(Collectors.toMap(Shift::getCode, shift -> shift));

        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday, shifts.get("OPEN_03_12").getId(), true),
                "manager@test.com");
        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday.plusDays(1), shifts.get("OPEN_03_12").getId(), true),
                "manager@test.com");
        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday.plusDays(2), shifts.get("OPEN_03_12").getId(), true),
                "manager@test.com");
        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday.plusDays(3), true),
                "manager@test.com");
        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday.plusDays(4), true),
                "manager@test.com");
        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday.plusDays(5), shifts.get("NORMAL_08_17").getId(), true),
                "manager@test.com");
        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday.plusDays(6), shifts.get("SCO_11_20").getId(), true),
                "manager@test.com");

        WeeklyPlanningResponse generated = planningGenerationService.generate(nextMonday);

        assertThat(generated.assignments())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.plusDays(1).toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.plusDays(2).toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.plusDays(5).toString())
                        && item.shiftCode().equals("NORMAL_08_17")
                        && item.locked())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.plusDays(6).toString())
                        && item.shiftCode().equals("SCO_11_20")
                        && item.locked());
        assertThat(generated.lockedOffDays())
                .contains(agent.getId() + "|" + nextMonday.plusDays(3))
                .contains(agent.getId() + "|" + nextMonday.plusDays(4));
        assertThat(generated.assignments())
                .noneMatch(item -> item.agentId().equals(agent.getId())
                        && (item.assignmentDate().equals(nextMonday.plusDays(3).toString())
                        || item.assignmentDate().equals(nextMonday.plusDays(4).toString())));
    }

    @Test
    void frozenPatternOverridesAlreadyExistingNextWeekAssignments() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 8);
        LocalDate nextMonday = firstMonday.plusWeeks(1);
        PlanningWeek staleNextWeek = weekRepository.save(new PlanningWeek(nextMonday, PlanningStatus.DRAFT));
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        Map<String, Shift> shifts = shiftRepository.findByActiveTrueOrderByStartTime().stream()
                .collect(Collectors.toMap(Shift::getCode, shift -> shift));
        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday, shifts.get("OPEN_03_12").getId(), true),
                "manager@test.com");
        assignmentRepository.save(new PlanningAssignment(
                staleNextWeek.getId(), agent.getId(), shifts.get("CLOSE_13_22"), nextMonday, false, true));

        WeeklyPlanningResponse visible = planningGenerationService.getWeek(nextMonday);
        WeeklyPlanningResponse generated = planningGenerationService.generate(nextMonday);

        assertThat(visible.assignments())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked())
                .noneMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.toString())
                        && item.shiftCode().equals("CLOSE_13_22"));
        assertThat(generated.assignments())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked());
    }

    @Test
    void generationKeepsFrozenRestConflictAsWarning() {
        LocalDate previousMonday = LocalDate.of(2026, 6, 8);
        LocalDate nextMonday = previousMonday.plusWeeks(1);
        PlanningWeek previousWeek = weekRepository.save(new PlanningWeek(previousMonday, PlanningStatus.DRAFT));
        PlanningWeek nextWeek = weekRepository.save(new PlanningWeek(nextMonday, PlanningStatus.DRAFT));
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(1);
        Map<String, Shift> shifts = shiftRepository.findByActiveTrueOrderByStartTime().stream()
                .collect(Collectors.toMap(Shift::getCode, shift -> shift));
        assignmentRepository.save(new PlanningAssignment(
                previousWeek.getId(), agent.getId(), shifts.get("SCO_11_20"), previousMonday.plusDays(6), false, true));
        assignmentRepository.save(new PlanningAssignment(
                nextWeek.getId(), agent.getId(), shifts.get("OPEN_03_12"), nextMonday, true, false));

        WeeklyPlanningResponse generated = planningGenerationService.generate(nextMonday);

        assertThat(generated.problems())
                .noneMatch(problem -> problem.code().equals("NO_VALID_PLANNING"))
                .anyMatch(problem -> problem.code().equals("REST_LESS_THAN_10H")
                        && problem.severity() == ProblemSeverity.WARNING);
        assertThat(generated.assignments())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked());
    }

    @Test
    void generationAvoidsSundayLateShiftBeforeNextMondayFrozenOpening() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        LocalDate nextMonday = monday.plusWeeks(1);
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(1);
        Shift opening = shiftRepository.findFirstByCategoryAndActiveTrueOrderByStartTime(ShiftCategory.OPENING).orElseThrow();
        planningGenerationService.setAssignmentLock(
                nextMonday,
                new AssignmentLockRequest(agent.getId(), nextMonday, opening.getId(), true),
                "manager@test.com"
        );

        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);

        assertThat(generated.assignments())
                .noneMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(monday.plusDays(6).toString())
                        && item.shiftCode().equals("SCO_11_20"));
    }

    @Test
    void generationProjectsCurrentWeekLocksBeforeAssigningSundayRest() {
        LocalDate monday = LocalDate.of(2026, 6, 8);
        PlanningWeek week = weekRepository.save(new PlanningWeek(monday, PlanningStatus.DRAFT));
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(1);
        Shift opening = shiftRepository.findFirstByCategoryAndActiveTrueOrderByStartTime(ShiftCategory.OPENING).orElseThrow();
        assignmentRepository.save(new PlanningAssignment(
                week.getId(), agent.getId(), opening, monday, true, false));

        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);

        assertThat(generated.assignments())
                .noneMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(monday.plusDays(6).toString())
                        && item.shiftCode().equals("SCO_11_20"));
    }

    @Test
    void oneLockedCellDoesNotCopyWholeAgentWeekPattern() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 8);
        LocalDate nextMonday = firstMonday.plusWeeks(1);
        PlanningWeek lockedWeek = weekRepository.save(new PlanningWeek(firstMonday, PlanningStatus.DRAFT));
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        Map<String, Shift> shifts = shiftRepository.findByActiveTrueOrderByStartTime().stream()
                .collect(Collectors.toMap(Shift::getCode, shift -> shift));

        planningGenerationService.setAssignmentLock(
                firstMonday,
                new AssignmentLockRequest(agent.getId(), firstMonday, shifts.get("OPEN_03_12").getId(), true),
                "manager@test.com");
        assignmentRepository.save(new PlanningAssignment(
                lockedWeek.getId(), agent.getId(), shifts.get("CLOSE_13_22"), firstMonday.plusDays(3), false, false));

        WeeklyPlanningResponse generated = planningGenerationService.generate(nextMonday);

        assertThat(generated.assignments())
                .anyMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.toString())
                        && item.shiftCode().equals("OPEN_03_12")
                        && item.locked())
                .noneMatch(item -> item.agentId().equals(agent.getId())
                        && item.assignmentDate().equals(nextMonday.plusDays(3).toString())
                        && item.shiftCode().equals("CLOSE_13_22")
                        && item.locked());
    }

    @Test
    void exposesHistoricalWeekendOffStatistics() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
        planningGenerationService.save(saveRequest(monday, generated));

        assertThat(planningGenerationService.weekendOffStatistics(monday, monday.plusDays(6)))
                .hasSize(12)
                .allSatisfy(statistic -> {
                    assertThat(statistic.periodStart()).isEqualTo(monday);
                    assertThat(statistic.periodEnd()).isEqualTo(monday.plusDays(6));
                });
    }

    @Test
    void supervisorOverridePersistsReasonAndAuditRecord() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
        List<AssignmentDraftRequest> incomplete = generated.assignments().stream()
                .skip(1)
                .map(item -> new AssignmentDraftRequest(
                        item.id(),
                        item.agentId(),
                        item.shiftId(),
                        LocalDate.parse(item.assignmentDate()),
                        item.locked(),
                        false
                ))
                .toList();
        SaveWeeklyPlanningRequest request = new SaveWeeklyPlanningRequest(
                monday,
                incomplete,
                false,
                ValidationMode.SUPERVISOR_OVERRIDE,
                true,
                "Temporary operational exception"
        );

        WeeklyPlanningResponse saved = planningGenerationService.save(
                request, "manager@test.com", true);

        assertThat(saved.manuallyOverridden()).isTrue();
        assertThat(saved.problems()).allMatch(problem -> problem.severity() != ProblemSeverity.ERROR);
        assertThat(overrideAuditRepository.count()).isPositive();
    }

    @Test
    void rejectsInvalidPlanningInsteadOfPersistingIt() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        PlanningAgent agent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        Shift opening = shiftRepository.findFirstByCategoryAndActiveTrueOrderByStartTime(ShiftCategory.OPENING).orElseThrow();
        SaveWeeklyPlanningRequest invalid = new SaveWeeklyPlanningRequest(
                monday,
                List.of(new AssignmentDraftRequest(null, agent.getId(), opening.getId(), monday, false, false)),
                false
        );

        assertThatThrownBy(() -> planningGenerationService.save(invalid))
                .isInstanceOf(PlanningValidationException.class);
        assertThat(weekRepository.findByWeekStartDate(monday)).isEmpty();
    }

    @Test
    void savesAndPublishesOnlyAValidPlanning() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
        SaveWeeklyPlanningRequest request = new SaveWeeklyPlanningRequest(
                monday,
                generated.assignments().stream()
                        .map(item -> new AssignmentDraftRequest(
                                item.id(),
                                item.agentId(),
                                item.shiftId(),
                                LocalDate.parse(item.assignmentDate()),
                                item.locked(),
                                item.generated()
                        ))
                        .toList(),
                false
        );

        WeeklyPlanningResponse saved = planningGenerationService.save(request);
        WeeklyPlanningResponse published = planningGenerationService.publish(saved.planningWeekId());

        assertThat(saved.planningWeekId()).isNotNull();
        assertThat(saved.status()).isEqualTo(PlanningStatus.DRAFT);
        assertThat(published.status()).isEqualTo(PlanningStatus.PUBLISHED);
    }

    @Test
    void followsHistoricalStyleWithPairedOffDaysAndStableShiftRuns() {
        LocalDate monday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse response = planningGenerationService.generate(monday);

        long agentsWithPairedOffDays = response.agentSummaries().stream()
                .filter(summary -> {
                    List<LocalDate> worked = response.assignments().stream()
                            .filter(item -> item.agentId().equals(summary.agentId()))
                            .map(item -> LocalDate.parse(item.assignmentDate()))
                            .toList();
                    List<LocalDate> off = java.util.stream.IntStream.range(0, 7)
                            .mapToObj(monday::plusDays)
                            .filter(day -> !worked.contains(day))
                            .sorted()
                            .toList();
                    return off.size() == 2 && off.get(1).equals(off.get(0).plusDays(1));
                })
                .count();

        long stableAdjacentShiftDays = response.agentSummaries().stream()
                .mapToLong(summary -> {
                    List<com.cgi.intranet.planning.dto.response.PlanningAssignmentResponse> assignments =
                            response.assignments().stream()
                                    .filter(item -> item.agentId().equals(summary.agentId()))
                                    .sorted(Comparator.comparing(item -> LocalDate.parse(item.assignmentDate())))
                                    .toList();
                    long stable = 0;
                    for (int index = 1; index < assignments.size(); index++) {
                        var previous = assignments.get(index - 1);
                        var current = assignments.get(index);
                        if (LocalDate.parse(current.assignmentDate())
                                .equals(LocalDate.parse(previous.assignmentDate()).plusDays(1))
                                && current.shiftCode().equals(previous.shiftCode())) {
                            stable++;
                        }
                    }
                    return stable;
                })
                .sum();

        assertThat(agentsWithPairedOffDays).isGreaterThanOrEqualTo(4);
        assertThat(stableAdjacentShiftDays).isGreaterThanOrEqualTo(2);
    }

    @Test
    void changesOffDaysBetweenCalendarWeeksEvenWithoutSavedHistory() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse first = planningGenerationService.generate(firstMonday);
        WeeklyPlanningResponse second = planningGenerationService.generate(firstMonday.plusWeeks(1));

        Map<Long, Set<Integer>> firstOffDays = offDayIndexes(first, firstMonday);
        Map<Long, Set<Integer>> secondOffDays = offDayIndexes(second, firstMonday.plusWeeks(1));

        long changedAgents = firstOffDays.keySet().stream()
                .filter(agentId -> !firstOffDays.get(agentId).equals(secondOffDays.get(agentId)))
                .count();

        assertThat(changedAgents).isGreaterThanOrEqualTo(5);
    }

    @Test
    void savedPreviousWeekStronglyPreventsRepeatingTheSameOffPair() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse first = planningGenerationService.generate(firstMonday);
        planningGenerationService.save(saveRequest(firstMonday, first));

        WeeklyPlanningResponse second = planningGenerationService.generate(firstMonday.plusWeeks(1));
        Map<Long, Set<Integer>> firstOffDays = offDayIndexes(first, firstMonday);
        Map<Long, Set<Integer>> secondOffDays = offDayIndexes(second, firstMonday.plusWeeks(1));

        long exactRepeats = firstOffDays.keySet().stream()
                .filter(agentId -> firstOffDays.get(agentId).equals(secondOffDays.get(agentId)))
                .count();

        assertThat(exactRepeats).isZero();
    }

    @Test
    void assignsFixedAndFairlyRotatingSundayScoAgents() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 15);
        PlanningAgent fixed = agentRepository.findByActiveTrueOrderByFullName().stream()
                .filter(PlanningAgent::isFixedSco)
                .findFirst()
                .orElseThrow();
        Set<Long> rotatingAgents = new java.util.HashSet<>();

        for (int week = 0; week < 3; week++) {
            LocalDate monday = firstMonday.plusWeeks(week);
            WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
            assertThat(generated.problems()).noneMatch(problem -> problem.severity() == ProblemSeverity.ERROR);
            String sunday = monday.plusDays(6).toString();
            var sco = generated.assignments().stream()
                    .filter(item -> item.assignmentDate().equals(sunday))
                    .filter(item -> item.shiftCode().equals("SCO_11_20"))
                    .toList();
            assertThat(sco).hasSize(2);
            assertThat(sco).anyMatch(item -> item.agentId().equals(fixed.getId()));
            rotatingAgents.add(sco.stream()
                    .filter(item -> !item.agentId().equals(fixed.getId()))
                    .findFirst()
                    .orElseThrow()
                    .agentId());
            planningGenerationService.save(saveRequest(monday, generated));
        }

        assertThat(rotatingAgents).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void prioritizesAgentsWithFewerCompleteWeekendOffAcrossSavedWeeks() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 29);

        for (int week = 0; week < 8; week++) {
            LocalDate monday = firstMonday.plusWeeks(week);
            WeeklyPlanningResponse generated = planningGenerationService.generate(monday);
            assertThat(generated.problems()).noneMatch(problem -> problem.severity() == ProblemSeverity.ERROR);
            planningGenerationService.save(saveRequest(monday, generated));
        }

        var statistics = planningGenerationService
                .weekendOffStatistics(firstMonday, firstMonday.plusWeeks(8).minusDays(1))
                .stream()
                .sorted(Comparator.comparing(statistic -> statistic.fullName()))
                .toList();
        PlanningAgent fixedSco = agentRepository.findByActiveTrueOrderByFullName().stream()
                .filter(PlanningAgent::isFixedSco)
                .findFirst()
                .orElseThrow();
        assertThat(statistics)
                .filteredOn(statistic -> statistic.agentId().equals(fixedSco.getId()))
                .singleElement()
                .satisfies(statistic -> assertThat(statistic.completeWeekendOffCount()).isZero());
        List<Long> completeWeekendOffCounts = statistics.stream()
                .filter(statistic -> !statistic.agentId().equals(fixedSco.getId()))
                .map(statistic -> statistic.completeWeekendOffCount())
                .toList();

        long minimum = completeWeekendOffCounts.stream().mapToLong(Long::longValue).min().orElseThrow();
        long maximum = completeWeekendOffCounts.stream().mapToLong(Long::longValue).max().orElseThrow();
        long total = completeWeekendOffCounts.stream().mapToLong(Long::longValue).sum();
        assertThat(total).isEqualTo(16);
        assertThat(maximum - minimum).isLessThanOrEqualTo(1);
    }

    @Test
    void generatedTransitionsAlwaysProvideAtLeastTenHoursRestIncludingAcrossWeeks() {
        LocalDate firstMonday = LocalDate.of(2026, 6, 15);
        WeeklyPlanningResponse first = planningGenerationService.generate(firstMonday);
        planningGenerationService.save(saveRequest(firstMonday, first));
        WeeklyPlanningResponse second = planningGenerationService.generate(firstMonday.plusWeeks(1));

        Map<Long, List<com.cgi.intranet.planning.dto.response.PlanningAssignmentResponse>> byAgent =
                java.util.stream.Stream.concat(first.assignments().stream(), second.assignments().stream())
                        .collect(Collectors.groupingBy(item -> item.agentId()));
        byAgent.values().forEach(items -> {
            List<com.cgi.intranet.planning.dto.response.PlanningAssignmentResponse> sorted = items.stream()
                    .sorted(Comparator.comparing(item -> LocalDate.parse(item.assignmentDate())))
                    .toList();
            for (int index = 1; index < sorted.size(); index++) {
                var previous = sorted.get(index - 1);
                var current = sorted.get(index);
                if (LocalDate.parse(current.assignmentDate()).equals(LocalDate.parse(previous.assignmentDate()))) {
                    continue;
                }
                var previousEnd = LocalDate.parse(previous.assignmentDate()).atTime(LocalTime.parse(previous.endTime()));
                var currentStart = LocalDate.parse(current.assignmentDate()).atTime(LocalTime.parse(current.startTime()));
                assertThat(java.time.Duration.between(previousEnd, currentStart).toHours()).isGreaterThanOrEqualTo(10);
            }
        });
    }

    @Test
    void rotatesEveryAgentAcrossAllSevenStandardShiftsWithinEightSavedWeeks() {
        LocalDate monday = LocalDate.of(2026, 4, 20);
        Set<String> standard = Set.of(
                "OPEN_03_12", "NORMAL_05_14", "NORMAL_07_16", "NORMAL_08_17",
                "NORMAL_09_18", "CLOSE_12_21", "CLOSE_13_22"
        );
        Map<Long, Set<String>> covered = new java.util.HashMap<>();

        for (int week = 0; week < 8; week++) {
            LocalDate weekStart = monday.plusWeeks(week);
            WeeklyPlanningResponse generated = planningGenerationService.generate(weekStart);
            assertThat(generated.problems()).noneMatch(problem -> problem.severity() == ProblemSeverity.ERROR);
            generated.assignments().stream()
                    .filter(item -> standard.contains(item.shiftCode()))
                    .forEach(item -> covered.computeIfAbsent(item.agentId(), ignored -> new java.util.HashSet<>())
                            .add(item.shiftCode()));
            planningGenerationService.save(saveRequest(weekStart, generated));
        }

        assertThat(agentRepository.findByActiveTrueOrderByFullName())
                .allSatisfy(agent -> assertThat(covered.getOrDefault(agent.getId(), Set.of()))
                        .containsAll(standard));
    }

    private SaveWeeklyPlanningRequest saveRequest(
            LocalDate weekStart,
            WeeklyPlanningResponse planning
    ) {
        return new SaveWeeklyPlanningRequest(
                weekStart,
                planning.assignments().stream()
                        .map(item -> new AssignmentDraftRequest(
                                item.id(),
                                item.agentId(),
                                item.shiftId(),
                                LocalDate.parse(item.assignmentDate()),
                                item.locked(),
                                item.generated()
                        ))
                        .toList(),
                false
        );
    }

    private Map<Long, Set<Integer>> offDayIndexes(
            WeeklyPlanningResponse planning,
            LocalDate weekStart
    ) {
        Map<Long, Set<LocalDate>> worked = planning.assignments().stream()
                .collect(Collectors.groupingBy(
                        item -> item.agentId(),
                        Collectors.mapping(
                                item -> LocalDate.parse(item.assignmentDate()),
                                Collectors.toSet()
                        )
                ));
        return planning.agentSummaries().stream()
                .collect(Collectors.toMap(
                        summary -> summary.agentId(),
                        summary -> java.util.stream.IntStream.range(0, 7)
                                .filter(index -> !worked.getOrDefault(summary.agentId(), Set.of())
                                        .contains(weekStart.plusDays(index)))
                                .boxed()
                                .collect(Collectors.toSet())
                ));
    }

    private void assertShiftCount(
            WeeklyPlanningResponse response,
            String date,
            String shiftCode,
            int expected
    ) {
        assertThat(response.assignments().stream()
                .filter(item -> item.assignmentDate().equals(date))
                .filter(item -> item.shiftCode().equals(shiftCode)))
                .hasSize(expected);
    }
}
