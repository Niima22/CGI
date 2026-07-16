package com.cgi.intranet.planning.service;

import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;
import com.cgi.intranet.planning.dto.response.WeeklyPlanningResponse;
import com.cgi.intranet.planning.entity.AgentUnavailability;
import com.cgi.intranet.planning.entity.PlanningAgent;
import com.cgi.intranet.planning.entity.Shift;
import com.cgi.intranet.planning.enums.ProblemSeverity;
import com.cgi.intranet.planning.enums.ShiftCategory;
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
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:planning-rules;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "eureka.client.enabled=false"
})
class PlanningGenerationRulesTest {

    @Autowired
    private PlanningGenerationService planningGenerationService;

    @Autowired
    private PlanningExportService exportService;

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

        seedRequiredShifts();
        seedTwelveActiveAgents();
    }

    @Test
    void generatedWeekGivesEveryAgentFiveUniqueWorkingDaysAndFortyHours() {
        LocalDate weekStart = LocalDate.of(2026, 7, 6);

        WeeklyPlanningResponse response = planningGenerationService.generate(weekStart);

        assertThat(response.problems())
                .extracting(PlanningProblemResponse::severity)
                .doesNotContain(ProblemSeverity.ERROR);
        assertThat(response.agentSummaries()).hasSize(12);
        assertThat(response.agentSummaries())
                .allSatisfy(summary -> {
                    assertThat(summary.assignedHours()).isEqualTo(40);
                    assertThat(summary.offDays()).isEqualTo(2);
                });

        Map<String, Long> assignmentsByAgentAndDay = response.assignments().stream()
                .collect(Collectors.groupingBy(
                        assignment -> assignment.agentId() + "|" + assignment.assignmentDate(),
                        Collectors.counting()
                ));
        assertThat(assignmentsByAgentAndDay.values())
                .as("an agent must never receive two shifts on the same date")
                .allSatisfy(count -> assertThat(count).isEqualTo(1L));
    }

    @Test
    void generatedSundayUsesOnlyThreeEarlyNormalShiftsAndTwoScoShifts() {
        LocalDate weekStart = LocalDate.of(2026, 7, 6);
        String sunday = weekStart.plusDays(6).toString();
        PlanningAgent fixedSco = agentRepository.findByActiveTrueOrderByFullName().stream()
                .filter(PlanningAgent::isFixedSco)
                .findFirst()
                .orElseThrow();

        WeeklyPlanningResponse response = planningGenerationService.generate(weekStart);

        var sundayAssignments = response.assignments().stream()
                .filter(assignment -> assignment.assignmentDate().equals(sunday))
                .toList();
        assertThat(sundayAssignments).hasSize(5);
        assertThat(sundayAssignments)
                .extracting(assignment -> assignment.shiftCode())
                .containsOnly("NORMAL_05_14", "SCO_11_20");
        assertThat(sundayAssignments)
                .filteredOn(assignment -> assignment.shiftCode().equals("NORMAL_05_14"))
                .hasSize(3);
        assertThat(sundayAssignments)
                .filteredOn(assignment -> assignment.shiftCode().equals("SCO_11_20"))
                .hasSize(2)
                .anyMatch(assignment -> assignment.agentId().equals(fixedSco.getId()));
    }

    @Test
    void generatedWeekDoesNotScheduleAgentOnApprovedAbsenceDay() {
        LocalDate weekStart = LocalDate.of(2026, 7, 6);
        LocalDate absentDate = weekStart.plusDays(2);
        PlanningAgent absentAgent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        unavailabilityRepository.save(new AgentUnavailability(
                absentAgent.getId(),
                absentDate,
                "CONGE"
        ));

        WeeklyPlanningResponse response = planningGenerationService.generate(weekStart);

        assertThat(response.unavailableDays())
                .anyMatch(day -> day.agentId().equals(absentAgent.getId())
                        && day.date().equals(absentDate.toString())
                        && day.reason().equals("CONGE"));
        assertThat(response.assignments())
                .noneMatch(assignment -> assignment.agentId().equals(absentAgent.getId())
                        && assignment.assignmentDate().equals(absentDate.toString()));
    }

    @Test
    void generatedWeekAdaptsWorkloadForAgentOnLeaveWithoutAgentAlert() {
        LocalDate weekStart = LocalDate.of(2026, 7, 6);
        PlanningAgent leaveAgent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        unavailabilityRepository.save(new AgentUnavailability(leaveAgent.getId(), weekStart.plusDays(0), "CONGE"));
        unavailabilityRepository.save(new AgentUnavailability(leaveAgent.getId(), weekStart.plusDays(1), "CONGE"));
        unavailabilityRepository.save(new AgentUnavailability(leaveAgent.getId(), weekStart.plusDays(2), "CONGE"));

        WeeklyPlanningResponse response = planningGenerationService.generate(weekStart);

        assertThat(response.problems())
                .noneMatch(problem -> leaveAgent.getId().equals(problem.agentId()));
        assertThat(response.assignments())
                .noneMatch(assignment -> assignment.agentId().equals(leaveAgent.getId())
                        && (
                                assignment.assignmentDate().equals(weekStart.plusDays(0).toString())
                                        || assignment.assignmentDate().equals(weekStart.plusDays(1).toString())
                                        || assignment.assignmentDate().equals(weekStart.plusDays(2).toString())
                        ));
        assertThat(response.agentSummaries())
                .filteredOn(summary -> summary.agentId().equals(leaveAgent.getId()))
                .singleElement()
                .satisfies(summary -> {
                    assertThat(summary.assignedHours()).isEqualTo(16);
                    assertThat(summary.offDays()).isEqualTo(5);
                });
    }

    @Test
    void generationReportsBlockingErrorWhenRequiredShiftIsMissing() {
        Shift scoShift = shiftRepository.findByActiveTrueOrderByStartTime().stream()
                .filter(shift -> shift.getCode().equals("SCO_11_20"))
                .findFirst()
                .orElseThrow();
        shiftRepository.delete(scoShift);

        WeeklyPlanningResponse response = planningGenerationService.generate(LocalDate.of(2026, 7, 6));

        assertThat(response.assignments()).isEmpty();
        assertThat(response.problems())
                .anyMatch(problem -> problem.code().equals("MISSING_SHIFT_DEFINITION")
                        && problem.severity() == ProblemSeverity.ERROR);
    }

    @Test
    void exportsGeneratedWeekAsExcelWorkbook() {
        WeeklyPlanningResponse planning = planningGenerationService.generate(LocalDate.of(2026, 7, 6));

        byte[] content = exportService.exportXlsx(planning);

        assertThat(content).hasSizeGreaterThan(1_000);
        assertThat(new String(content, 0, 2)).isEqualTo("PK");
    }

    @Test
    void exportsAbsenceAndLeaveDaysAsExcelOnlyTable() throws Exception {
        LocalDate weekStart = LocalDate.of(2026, 7, 6);
        PlanningAgent leaveAgent = agentRepository.findByActiveTrueOrderByFullName().get(0);
        PlanningAgent absentAgent = agentRepository.findByActiveTrueOrderByFullName().get(1);
        unavailabilityRepository.save(new AgentUnavailability(leaveAgent.getId(), weekStart.plusDays(1), "CONGE"));
        unavailabilityRepository.save(new AgentUnavailability(absentAgent.getId(), weekStart.plusDays(2), "ABSENT"));

        WeeklyPlanningResponse planning = planningGenerationService.generate(weekStart);
        byte[] content = exportService.exportXlsx(planning);

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            var sheet = workbook.getSheet("Absences");

            assertThat(sheet).isNotNull();
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue())
                    .isEqualTo("Jours de conge, absence et retards");
            assertThat(sheet.getRow(3).getCell(1).getStringCellValue()).isEqualTo("Conge (jours)");
            assertThat(absenceValueFor(workbook, leaveAgent.getFullName(), 1)).isEqualTo(1);
            assertThat(absenceValueFor(workbook, absentAgent.getFullName(), 2)).isEqualTo(1);
        }
    }

    @Test
    void exportsGeneratedWeekAsPdfDocument() {
        WeeklyPlanningResponse planning = planningGenerationService.generate(LocalDate.of(2026, 7, 6));

        byte[] content = exportService.exportPdf(planning);

        assertThat(content).hasSizeGreaterThan(1_000);
        assertThat(new String(content, 0, 4)).isEqualTo("%PDF");
    }

    private void seedRequiredShifts() {
        shiftRepository.save(new Shift("OPEN_03_12", "Opening 03:00-12:00", ShiftCategory.OPENING, LocalTime.of(3, 0), LocalTime.of(12, 0)));
        shiftRepository.save(new Shift("NORMAL_05_14", "Normal 05:00-14:00", ShiftCategory.NORMAL, LocalTime.of(5, 0), LocalTime.of(14, 0)));
        shiftRepository.save(new Shift("NORMAL_07_16", "Normal 07:00-16:00", ShiftCategory.NORMAL, LocalTime.of(7, 0), LocalTime.of(16, 0)));
        shiftRepository.save(new Shift("NORMAL_08_17", "Normal 08:00-17:00", ShiftCategory.NORMAL, LocalTime.of(8, 0), LocalTime.of(17, 0)));
        shiftRepository.save(new Shift("NORMAL_09_18", "Normal 09:00-18:00", ShiftCategory.NORMAL, LocalTime.of(9, 0), LocalTime.of(18, 0)));
        shiftRepository.save(new Shift("CLOSE_12_21", "Closing 12:00-21:00", ShiftCategory.CLOSING, LocalTime.of(12, 0), LocalTime.of(21, 0)));
        shiftRepository.save(new Shift("CLOSE_13_22", "Late closing 13:00-22:00", ShiftCategory.CLOSING, LocalTime.of(13, 0), LocalTime.of(22, 0)));
        shiftRepository.save(new Shift("SCO_11_20", "SCO 11:00-20:00", ShiftCategory.SCO, LocalTime.of(11, 0), LocalTime.of(20, 0)));
    }

    private void seedTwelveActiveAgents() {
        for (int i = 1; i <= 12; i++) {
            PlanningAgent agent = new PlanningAgent("Agent " + i, "agent" + i + "@test.com");
            agent.setFixedSco(i == 1);
            agentRepository.save(agent);
        }
    }

    private double absenceValueFor(XSSFWorkbook workbook, String agentName, int columnIndex) {
        var sheet = workbook.getSheet("Absences");
        for (int rowIndex = 4; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            var row = sheet.getRow(rowIndex);
            if (row != null && row.getCell(0) != null
                    && agentName.equals(row.getCell(0).getStringCellValue())) {
                return row.getCell(columnIndex).getNumericCellValue();
            }
        }
        throw new AssertionError("Agent was not found in absence export: " + agentName);
    }
}
