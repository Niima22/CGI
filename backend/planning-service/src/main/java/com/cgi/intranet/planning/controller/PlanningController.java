package com.cgi.intranet.planning.controller;

import com.cgi.intranet.planning.dto.request.GenerateWeeklyPlanningRequest;
import com.cgi.intranet.planning.dto.request.LeaveRequestRequest;
import com.cgi.intranet.planning.dto.request.ConfigureFixedScoRequest;
import com.cgi.intranet.planning.dto.request.AgentUnavailabilityRequest;
import com.cgi.intranet.planning.dto.request.AssignmentLockRequest;
import com.cgi.intranet.planning.dto.request.SaveWeeklyPlanningRequest;
import com.cgi.intranet.planning.dto.request.ShiftSwapRequestRequest;
import com.cgi.intranet.planning.dto.request.TeleworkRequestRequest;
import com.cgi.intranet.planning.dto.response.PlanningAgentResponse;
import com.cgi.intranet.planning.dto.response.LeaveRequestResponse;
import com.cgi.intranet.planning.dto.response.PlanningAgentOptionResponse;
import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;
import com.cgi.intranet.planning.dto.response.PlanningViewerResponse;
import com.cgi.intranet.planning.dto.response.ShiftSwapRequestResponse;
import com.cgi.intranet.planning.dto.response.TeleworkRequestResponse;
import com.cgi.intranet.planning.dto.response.WeeklyPlanningResponse;
import com.cgi.intranet.planning.dto.response.WeekendOffStatisticResponse;
import com.cgi.intranet.planning.entity.PlanningAgent;
import com.cgi.intranet.planning.entity.LeaveRequest;
import com.cgi.intranet.planning.entity.ShiftSwapRequest;
import com.cgi.intranet.planning.entity.TeleworkRequest;
import com.cgi.intranet.planning.repository.LeaveRequestRepository;
import com.cgi.intranet.planning.repository.PlanningAgentRepository;
import com.cgi.intranet.planning.repository.ShiftSwapRequestRepository;
import com.cgi.intranet.planning.repository.TeleworkRequestRepository;
import com.cgi.intranet.planning.service.PlanningGenerationService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/plannings")
public class PlanningController {

    private final PlanningGenerationService planningGenerationService;
    private final PlanningAgentRepository agentRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final TeleworkRequestRepository teleworkRequestRepository;
    private final ShiftSwapRequestRepository shiftSwapRequestRepository;

    public PlanningController(
            PlanningGenerationService planningGenerationService,
            PlanningAgentRepository agentRepository,
            LeaveRequestRepository leaveRequestRepository,
            TeleworkRequestRepository teleworkRequestRepository,
            ShiftSwapRequestRepository shiftSwapRequestRepository
    ) {
        this.planningGenerationService = planningGenerationService;
        this.agentRepository = agentRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.teleworkRequestRepository = teleworkRequestRepository;
        this.shiftSwapRequestRepository = shiftSwapRequestRepository;
    }

    @GetMapping("/agents")
    public List<PlanningAgentResponse> agents() {
        return agentRepository.findByActiveTrueOrderByFullName().stream()
                .map(agent -> new PlanningAgentResponse(
                        agent.getId(),
                        agent.getFullName(),
                        agent.getEmail(),
                        agent.isActive(),
                        agent.isFixedSco()
                ))
                .toList();
    }

    @GetMapping("/agents/swap-options")
    public List<PlanningAgentOptionResponse> agentSwapOptions() {
        return agentRepository.findByActiveTrueOrderByFullName().stream()
                .map(agent -> new PlanningAgentOptionResponse(agent.getId(), agent.getFullName()))
                .toList();
    }

    @GetMapping("/viewer")
    public PlanningViewerResponse viewer(Authentication authentication) {
        if (isSupervisor(authentication)) {
            return new PlanningViewerResponse(true, true, null, null);
        }
        String email = extractEmail(authentication);
        PlanningAgent agent = email == null
                ? null
                : agentRepository.findByEmailIgnoreCase(email).filter(PlanningAgent::isActive).orElse(null);
        return new PlanningViewerResponse(
                false,
                agent != null,
                agent == null ? null : agent.getId(),
                agent == null ? null : agent.getFullName()
        );
    }

    @PostMapping("/agents/fixed-sco")
    public PlanningAgentResponse configureFixedSco(@Valid @RequestBody ConfigureFixedScoRequest request) {
        PlanningAgent selected = agentRepository.findById(request.agentId())
                .filter(PlanningAgent::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Active planning agent " + request.agentId() + " was not found."));
        agentRepository.findByActiveTrueOrderByFullName().forEach(agent -> {
            agent.setFixedSco(agent.getId().equals(selected.getId()));
            agentRepository.save(agent);
        });
        return new PlanningAgentResponse(
                selected.getId(),
                selected.getFullName(),
                selected.getEmail(),
                selected.isActive(),
                true
        );
    }

    @GetMapping("/weeks")
    public WeeklyPlanningResponse getWeek(@RequestParam LocalDate weekStartDate, Authentication authentication) {
        return filterForViewer(planningGenerationService.getWeek(weekStartDate), authentication);
    }

    @GetMapping("/week/{weekStartDate}")
    public WeeklyPlanningResponse getWeekByPath(
            @PathVariable LocalDate weekStartDate,
            Authentication authentication
    ) {
        return filterForViewer(planningGenerationService.getWeek(weekStartDate), authentication);
    }

    @PostMapping({"/weeks/generate", "/generate"})
    public WeeklyPlanningResponse generate(@Valid @RequestBody GenerateWeeklyPlanningRequest request) {
        return planningGenerationService.generate(request);
    }

    @PostMapping("/weeks")
    public WeeklyPlanningResponse save(
            @Valid @RequestBody SaveWeeklyPlanningRequest request,
            Authentication authentication
    ) {
        return planningGenerationService.save(
                request,
                supervisorIdentity(authentication),
                isSupervisor(authentication)
        );
    }

    @PostMapping("/validate")
    public WeeklyPlanningResponse validate(@Valid @RequestBody SaveWeeklyPlanningRequest request) {
        return planningGenerationService.validate(request);
    }

    @PostMapping("/{id}/publish")
    public WeeklyPlanningResponse publish(@PathVariable Long id) {
        return planningGenerationService.publish(id);
    }

    @PatchMapping("/week/{weekStartDate}/lock")
    public WeeklyPlanningResponse setAssignmentLock(
            @PathVariable LocalDate weekStartDate,
            @Valid @RequestBody AssignmentLockRequest request,
            Authentication authentication
    ) {
        return planningGenerationService.setAssignmentLock(
                weekStartDate, request, supervisorIdentity(authentication));
    }

    @PatchMapping("/week/{weekStartDate}/unavailability")
    public WeeklyPlanningResponse setAgentUnavailability(
            @PathVariable LocalDate weekStartDate,
            @Valid @RequestBody AgentUnavailabilityRequest request
    ) {
        return planningGenerationService.setAgentUnavailability(weekStartDate, request);
    }

    @GetMapping("/week/{weekStartDate}/telework-requests")
    public List<TeleworkRequestResponse> teleworkRequests(
            @PathVariable LocalDate weekStartDate,
            Authentication authentication
    ) {
        LocalDate start = weekStartDate.minusDays(weekStartDate.getDayOfWeek().getValue() - 1L);
        LocalDate end = start.plusDays(6);
        List<TeleworkRequest> requests = isSupervisor(authentication)
                ? teleworkRequestRepository.findByDateBetweenOrderByCreatedAtDesc(start, end)
                : teleworkRequestRepository.findByAgentIdAndDateBetweenOrderByCreatedAtDesc(
                        currentAgent(authentication).getId(), start, end);
        return requests.stream().map(this::toTeleworkResponse).toList();
    }

    @PostMapping("/telework-requests")
    public TeleworkRequestResponse createTeleworkRequest(
            @Valid @RequestBody TeleworkRequestRequest request,
            Authentication authentication
    ) {
        PlanningAgent agent = currentAgent(authentication);
        TeleworkRequest created = teleworkRequestRepository.save(new TeleworkRequest(
                agent.getId(),
                request.date(),
                normalizeText(request.reason())
        ));
        return toTeleworkResponse(created);
    }

    @GetMapping("/week/{weekStartDate}/leave-requests")
    public List<LeaveRequestResponse> leaveRequests(
            @PathVariable LocalDate weekStartDate,
            Authentication authentication
    ) {
        LocalDate start = weekStartDate.minusDays(weekStartDate.getDayOfWeek().getValue() - 1L);
        LocalDate end = start.plusDays(6);
        List<LeaveRequest> requests = isSupervisor(authentication)
                ? leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(end, start)
                : leaveRequestRepository.findByAgentIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
                        currentAgent(authentication).getId(), end, start);
        return requests.stream().map(this::toLeaveResponse).toList();
    }

    @PostMapping("/leave-requests")
    public LeaveRequestResponse createLeaveRequest(
            @Valid @RequestBody LeaveRequestRequest request,
            Authentication authentication
    ) {
        PlanningAgent agent = currentAgent(authentication);
        LocalDate endDate = request.endDate() == null ? request.startDate() : request.endDate();
        if (endDate.isBefore(request.startDate())) {
            throw new IllegalArgumentException("Leave end date cannot be before start date.");
        }
        LeaveRequest created = leaveRequestRepository.save(new LeaveRequest(
                agent.getId(),
                request.startDate(),
                endDate,
                normalizeText(request.reason())
        ));
        return toLeaveResponse(created);
    }

    @GetMapping("/swap-requests")
    public List<ShiftSwapRequestResponse> swapRequests(Authentication authentication) {
        List<ShiftSwapRequest> requests;
        if (isSupervisor(authentication)) {
            requests = shiftSwapRequestRepository.findByOrderByCreatedAtDesc();
        } else {
            Long agentId = currentAgent(authentication).getId();
            requests = shiftSwapRequestRepository
                    .findByRequesterAgentIdOrTargetAgentIdOrderByCreatedAtDesc(agentId, agentId);
        }
        return requests.stream().map(this::toSwapResponse).toList();
    }

    @PostMapping("/swap-requests")
    public ShiftSwapRequestResponse createSwapRequest(
            @Valid @RequestBody ShiftSwapRequestRequest request,
            Authentication authentication
    ) {
        PlanningAgent requester = currentAgent(authentication);
        PlanningAgent target = agentRepository.findById(request.targetAgentId())
                .filter(PlanningAgent::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Active target planning agent was not found."));
        if (requester.getId().equals(target.getId())) {
            throw new IllegalArgumentException("Swap target must be another agent.");
        }
        ShiftSwapRequest created = shiftSwapRequestRepository.save(new ShiftSwapRequest(
                requester.getId(),
                target.getId(),
                request.requesterDate(),
                request.targetDate(),
                normalizeText(request.reason())
        ));
        return toSwapResponse(created);
    }

    @GetMapping("/weekend-off-statistics")
    public List<WeekendOffStatisticResponse> weekendOffStatistics(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to
    ) {
        return planningGenerationService.weekendOffStatistics(from, to);
    }

    private WeeklyPlanningResponse filterForViewer(
            WeeklyPlanningResponse response,
            Authentication authentication
    ) {
        if (authentication == null || isSupervisor(authentication)) {
            return response;
        }

        String email = extractEmail(authentication);
        PlanningAgent agent = email == null
                ? null
                : agentRepository.findByEmailIgnoreCase(email).orElse(null);
        if (agent == null) {
            return new WeeklyPlanningResponse(
                    response.planningWeekId(),
                    response.status(),
                    response.weekStartDate(),
                    response.weekEndDate(),
                    response.shifts(),
                    List.of(),
                    List.of(),
                    List.of(),
                    response.lockedOffDays(),
                    List.of(),
                    response.unavailableDays(),
                    response.manuallyOverridden()
            );
        }

        Long agentId = agent.getId();
        List<PlanningProblemResponse> visibleProblems = response.problems().stream()
                .filter(problem -> problem.agentId() == null || problem.agentId().equals(agentId))
                .toList();
        return new WeeklyPlanningResponse(
                response.planningWeekId(),
                response.status(),
                response.weekStartDate(),
                response.weekEndDate(),
                response.shifts(),
                response.assignments().stream().filter(item -> item.agentId().equals(agentId)).toList(),
                visibleProblems,
                response.agentSummaries().stream().filter(item -> item.agentId().equals(agentId)).toList(),
                response.lockedOffDays().stream()
                        .filter(key -> key.startsWith(agentId + "|"))
                        .toList(),
                response.freezes().stream()
                        .filter(item -> item.agentId().equals(agentId))
                        .toList(),
                response.unavailableDays().stream()
                        .filter(item -> item.agentId().equals(agentId))
                        .toList(),
                response.manuallyOverridden()
        );
    }

    private boolean isSupervisor(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")
                        || authority.getAuthority().equals("ROLE_MANAGER"));
    }

    private String extractEmail(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            Jwt jwt = jwtAuthentication.getToken();
            String email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) {
                return email;
            }
            String username = jwt.getClaimAsString("preferred_username");
            return username != null && username.contains("@") ? username : null;
        }
        return null;
    }

    private PlanningAgent currentAgent(Authentication authentication) {
        String email = extractEmail(authentication);
        if (email == null) {
            if (isDevAdmin(authentication)) {
                return agentRepository.findByActiveTrueOrderByFullName().stream()
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("No active planning agent was found."));
            }
            throw new IllegalArgumentException("Authenticated user is not linked to a planning agent.");
        }
        return agentRepository.findByEmailIgnoreCase(email)
                .filter(PlanningAgent::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user is not linked to a planning agent."));
    }

    private boolean isDevAdmin(Authentication authentication) {
        return authentication != null && "dev-admin".equals(authentication.getName());
    }

    private String supervisorIdentity(Authentication authentication) {
        String email = extractEmail(authentication);
        return email == null ? authentication.getName() : email;
    }

    private TeleworkRequestResponse toTeleworkResponse(TeleworkRequest request) {
        return new TeleworkRequestResponse(
                request.getId(),
                request.getAgentId(),
                agentName(request.getAgentId()),
                request.getDate().toString(),
                request.getStatus(),
                request.getReason(),
                request.getCreatedAt().toString()
        );
    }

    private LeaveRequestResponse toLeaveResponse(LeaveRequest request) {
        return new LeaveRequestResponse(
                request.getId(),
                request.getAgentId(),
                agentName(request.getAgentId()),
                request.getStartDate().toString(),
                request.getEndDate().toString(),
                request.getStatus(),
                request.getReason(),
                request.getCreatedAt().toString()
        );
    }

    private ShiftSwapRequestResponse toSwapResponse(ShiftSwapRequest request) {
        return new ShiftSwapRequestResponse(
                request.getId(),
                request.getRequesterAgentId(),
                agentName(request.getRequesterAgentId()),
                request.getTargetAgentId(),
                agentName(request.getTargetAgentId()),
                request.getRequesterDate().toString(),
                request.getTargetDate().toString(),
                request.getStatus(),
                request.getReason(),
                request.getCreatedAt().toString()
        );
    }

    private String agentName(Long agentId) {
        return agentRepository.findById(agentId)
                .map(PlanningAgent::getFullName)
                .orElse("Agent " + agentId);
    }

    private String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
