package com.cgi.intranet.planning.security;

import com.cgi.intranet.planning.controller.PlanningController;
import com.cgi.intranet.planning.repository.LeaveRequestRepository;
import com.cgi.intranet.planning.repository.PlanningAgentRepository;
import com.cgi.intranet.planning.repository.ShiftSwapRequestRepository;
import com.cgi.intranet.planning.repository.TeleworkRequestRepository;
import com.cgi.intranet.planning.dto.response.PlanningNotificationResponse;
import com.cgi.intranet.planning.service.PlanningExportService;
import com.cgi.intranet.planning.service.PlanningGenerationService;
import com.cgi.intranet.planning.service.PlanningNotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(PlanningController.class)
@Import(SecurityConfig.class)
class PlanningEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PlanningGenerationService planningGenerationService;

    @MockitoBean
    private PlanningExportService planningExportService;

    @MockitoBean
    private PlanningNotificationService planningNotificationService;

    @MockitoBean
    private PlanningAgentRepository planningAgentRepository;

    @MockitoBean
    private LeaveRequestRepository leaveRequestRepository;

    @MockitoBean
    private TeleworkRequestRepository teleworkRequestRepository;

    @MockitoBean
    private ShiftSwapRequestRepository shiftSwapRequestRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void employeeCannotGeneratePlanning() throws Exception {
        mockMvc.perform(post("/api/plannings/generate")
                        .with(user("employee").roles("EMPLOYEE"))
                        .contentType("application/json")
                        .content("""
                                {"weekStartDate":"2026-06-15"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCanGeneratePlanning() throws Exception {
        mockMvc.perform(post("/api/plannings/generate")
                        .with(user("manager").roles("MANAGER"))
                        .contentType("application/json")
                        .content("""
                                {"weekStartDate":"2026-06-15"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void employeeCannotListAllPlanningAgents() throws Exception {
        when(planningAgentRepository.findByActiveTrueOrderByFullName()).thenReturn(List.of());

        mockMvc.perform(get("/api/plannings/agents")
                        .with(user("employee").roles("EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void employeeCanListAgentSwapOptions() throws Exception {
        when(planningAgentRepository.findByActiveTrueOrderByFullName()).thenReturn(List.of());

        mockMvc.perform(get("/api/plannings/agents/swap-options")
                        .with(user("employee").roles("EMPLOYEE")))
                .andExpect(status().isOk());
    }

    @Test
    void employeeCannotConfigureFixedScoAgent() throws Exception {
        mockMvc.perform(post("/api/plannings/agents/fixed-sco")
                        .with(user("employee").roles("EMPLOYEE"))
                        .contentType("application/json")
                        .content("""
                                {"agentId":1}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void employeeViewerStateExplainsMissingAgentLink() throws Exception {
        mockMvc.perform(get("/api/plannings/viewer")
                        .with(user("employee").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supervisor").value(false))
                .andExpect(jsonPath("$.linkedToPlanningAgent").value(false));
    }

    @Test
    void employeeCanReadNotifications() throws Exception {
        when(planningNotificationService.visibleNotifications(null, Set.of("EMPLOYEE"), 20))
                .thenReturn(List.of(new PlanningNotificationResponse(
                        1L,
                        "PLANNING_PUBLISHED",
                        "Planning publie",
                        "Le planning est disponible.",
                        "/planning-view",
                        false,
                        java.time.LocalDateTime.of(2026, 7, 7, 10, 0)
                )));

        mockMvc.perform(get("/api/plannings/notifications")
                        .with(user("employee").roles("EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0))
                .andExpect(jsonPath("$.items[0].title").value("Planning publie"));
    }

    @Test
    void employeeCanMarkNotificationRead() throws Exception {
        mockMvc.perform(patch("/api/plannings/notifications/1/read")
                        .with(user("employee").roles("EMPLOYEE")))
                .andExpect(status().isNoContent());
    }

    @Test
    void managerViewerStateAllowsFullPlanningAccess() throws Exception {
        mockMvc.perform(get("/api/plannings/viewer")
                        .with(user("manager").roles("MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supervisor").value(true))
                .andExpect(jsonPath("$.linkedToPlanningAgent").value(true));
    }

    @Test
    void employeeCannotLockPlanningCell() throws Exception {
        mockMvc.perform(patch("/api/plannings/week/2026-06-15/lock")
                        .with(user("employee").roles("EMPLOYEE"))
                        .contentType("application/json")
                        .content("""
                                {"agentId":1,"assignmentDate":"2026-06-15","locked":true}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCanReadWeekendOffStatistics() throws Exception {
        when(planningGenerationService.weekendOffStatistics(
                java.time.LocalDate.of(2026, 5, 1),
                java.time.LocalDate.of(2026, 6, 30)
        )).thenReturn(List.of());

        mockMvc.perform(get("/api/plannings/weekend-off-statistics")
                        .param("from", "2026-05-01")
                        .param("to", "2026-06-30")
                        .with(user("manager").roles("MANAGER")))
                .andExpect(status().isOk());
    }
}
