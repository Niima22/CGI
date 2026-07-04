package com.cgi.intranet.planning.service.impl;

import com.cgi.intranet.planning.dto.request.AssignmentDraftRequest;
import com.cgi.intranet.planning.dto.request.AssignmentLockRequest;
import com.cgi.intranet.planning.dto.request.AgentUnavailabilityRequest;
import com.cgi.intranet.planning.dto.request.GenerateWeeklyPlanningRequest;
import com.cgi.intranet.planning.dto.request.SaveWeeklyPlanningRequest;
import com.cgi.intranet.planning.dto.response.AgentUnavailabilityResponse;
import com.cgi.intranet.planning.dto.response.PlanningAgentSummaryResponse;
import com.cgi.intranet.planning.dto.response.PlanningAssignmentResponse;
import com.cgi.intranet.planning.dto.response.PlanningFreezeResponse;
import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;
import com.cgi.intranet.planning.dto.response.ShiftResponse;
import com.cgi.intranet.planning.dto.response.WeeklyPlanningResponse;
import com.cgi.intranet.planning.dto.response.WeekendOffStatisticResponse;
import com.cgi.intranet.planning.entity.AgentUnavailability;
import com.cgi.intranet.planning.entity.PlanningAgent;
import com.cgi.intranet.planning.entity.PlanningAssignment;
import com.cgi.intranet.planning.entity.PlanningAssignmentFreeze;
import com.cgi.intranet.planning.entity.PlanningOffDayLock;
import com.cgi.intranet.planning.entity.PlanningOverrideAudit;
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
import com.cgi.intranet.planning.service.PlanningGenerationService;
import com.cgi.intranet.planning.service.PlanningValidationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PlanningGenerationServiceImpl implements PlanningGenerationService {

    private static final int REQUIRED_WORK_DAYS = 5;
    private static final int REQUIRED_AGENTS = 12;
    private static final int GENERATION_ATTEMPTS = 96;
    private static final int MIN_COMPLETE_WEEKEND_OFF_PER_WEEK = 2;
    private static final Set<String> STANDARD_SHIFT_CODES = Set.of(
            "OPEN_03_12",
            "NORMAL_05_14",
            "NORMAL_07_16",
            "NORMAL_08_17",
            "NORMAL_09_18",
            "CLOSE_12_21",
            "CLOSE_13_22"
    );
    private static final Set<String> GENERATION_WARNING_ERROR_CODES = Set.of(
            "REST_LESS_THAN_10H",
            "FIXED_SCO_AGENT_MISSING",
            "INVALID_ROTATING_SCO"
    );

    private final PlanningAgentRepository agentRepository;
    private final ShiftRepository shiftRepository;
    private final AgentUnavailabilityRepository unavailabilityRepository;
    private final PlanningWeekRepository planningWeekRepository;
    private final PlanningAssignmentRepository assignmentRepository;
    private final PlanningAssignmentFreezeRepository assignmentFreezeRepository;
    private final PlanningOffDayLockRepository offDayLockRepository;
    private final PlanningOverrideAuditRepository overrideAuditRepository;
    private final PlanningValidationService validationService;

    public PlanningGenerationServiceImpl(
            PlanningAgentRepository agentRepository,
            ShiftRepository shiftRepository,
            AgentUnavailabilityRepository unavailabilityRepository,
            PlanningWeekRepository planningWeekRepository,
            PlanningAssignmentRepository assignmentRepository,
            PlanningAssignmentFreezeRepository assignmentFreezeRepository,
            PlanningOffDayLockRepository offDayLockRepository,
            PlanningOverrideAuditRepository overrideAuditRepository,
            PlanningValidationService validationService
    ) {
        this.agentRepository = agentRepository;
        this.shiftRepository = shiftRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.planningWeekRepository = planningWeekRepository;
        this.assignmentRepository = assignmentRepository;
        this.assignmentFreezeRepository = assignmentFreezeRepository;
        this.offDayLockRepository = offDayLockRepository;
        this.overrideAuditRepository = overrideAuditRepository;
        this.validationService = validationService;
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyPlanningResponse generate(LocalDate weekStartDate) {
        LocalDate weekStart = normalizeWeekStart(weekStartDate);
        GenerationContext context = loadContext(weekStart);
        return generateWithContext(context);
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyPlanningResponse generate(GenerateWeeklyPlanningRequest request) {
        LocalDate weekStart = normalizeWeekStart(request.weekStartDate());
        GenerationContext context = loadContext(weekStart);
        Set<LocalDate> dates = request.datesToRegenerate() == null
                ? Set.of()
                : request.datesToRegenerate();
        if (!dates.isEmpty()) {
            if (dates.stream().anyMatch(date -> date.isBefore(weekStart)
                    || date.isAfter(weekStart.plusDays(6)))) {
                throw new IllegalArgumentException("Partial regeneration dates must belong to the selected week.");
            }
            List<PlanningDraftAssignment> protectedAssignments = new ArrayList<>(context.lockedAssignments());
            Set<String> lockedOffDayKeys = context.lockedOffDayKeys();
            currentAssignments(weekStart).stream()
                    .filter(item -> !dates.contains(item.assignmentDate()))
                    .filter(item -> !lockedOffDayKeys.contains(item.agentId() + "|" + item.assignmentDate()))
                    .filter(item -> protectedAssignments.stream().noneMatch(existing ->
                            existing.agentId().equals(item.agentId())
                                    && existing.assignmentDate().equals(item.assignmentDate())))
                    .map(item -> new PlanningDraftAssignment(
                            item.id(), item.agentId(), item.agentName(), item.shiftId(), item.shiftCode(),
                            item.shiftCategory(), item.assignmentDate(), item.startAt(), item.endAt(),
                            item.paidHours(), true, item.generated()))
                    .forEach(protectedAssignments::add);
            Set<String> protectedKeys = protectedAssignments.stream()
                    .map(PlanningDraftAssignment::key)
                    .collect(Collectors.toSet());
            context = new GenerationContext(
                    context.weekStart(), context.agents(), context.shifts(), context.shiftsByCategory(),
                    context.unavailableDays(), context.history(), protectedAssignments, protectedKeys,
                    context.lockedOffDays(), context.lockedOffDayKeys(), context.planningWeek()
            );
        }
        return generateWithContext(context);
    }

    private WeeklyPlanningResponse generateWithContext(GenerationContext context) {
        List<PlanningProblemResponse> setupProblems = validateGenerationSetup(context);
        if (hasErrors(setupProblems)) {
            return buildResponse(context, List.of(), setupProblems, Set.of());
        }

        List<PlanningDraftAssignment> bestDraft = List.of();
        List<PlanningProblemResponse> bestProblems = List.of();
        for (int attempt = 0; attempt < GENERATION_ATTEMPTS; attempt++) {
            GenerationResult generated = generateAttempt(context, attempt);
            List<PlanningProblemResponse> problems = new ArrayList<>(generated.problems());
            problems.addAll(validate(context, generated.assignments(), generated.lockedKeys()));
            if (!hasBlockingGenerationErrors(problems)) {
                return buildResponse(
                        context,
                        generated.assignments(),
                        downgradeGenerationWarnings(problems),
                        generated.lockedKeys()
                );
            }
            if (bestProblems.isEmpty() || blockingGenerationErrorCount(problems) < blockingGenerationErrorCount(bestProblems)) {
                bestDraft = generated.assignments();
                bestProblems = problems;
            }
        }

        List<PlanningProblemResponse> failed = new ArrayList<>(bestProblems);
        failed.add(0, problem(
                "NO_VALID_PLANNING",
                "No valid weekly planning could be generated after deterministic constraint-search attempts.",
                null,
                null
        ));
        return buildResponse(context, bestDraft, failed, context.lockedKeys());
    }

    @Override
    @Transactional
    public WeeklyPlanningResponse save(SaveWeeklyPlanningRequest request) {
        return save(request, "system", false);
    }

    @Override
    @Transactional
    public WeeklyPlanningResponse save(
            SaveWeeklyPlanningRequest request,
            String supervisorIdentity,
            boolean supervisor
    ) {
        LocalDate weekStart = normalizeWeekStart(request.weekStartDate());
        GenerationContext context = loadContext(weekStart);
        List<PlanningDraftAssignment> drafts = draftsFromRequest(request, context);
        ValidationMode mode = request.effectiveValidationMode();
        if (mode == ValidationMode.SUPERVISOR_OVERRIDE && !supervisor) {
            throw new IllegalArgumentException("Only ADMIN or MANAGER may use SUPERVISOR_OVERRIDE.");
        }
        List<PlanningProblemResponse> problems = validate(context, drafts, context.lockedKeys(), mode);
        rejectErrors("Planning was not saved because it violates mandatory rules.", problems);
        List<PlanningProblemResponse> overrideWarnings = problems.stream()
                .filter(problem -> problem.severity() == ProblemSeverity.WARNING)
                .filter(problem -> isOverrideableRule(problem.code()))
                .toList();
        if (mode == ValidationMode.SUPERVISOR_OVERRIDE && !overrideWarnings.isEmpty()) {
            if (!request.overrideConfirmed()) {
                throw new PlanningValidationException(
                        "Supervisor override confirmation is required.",
                        overrideWarnings
                );
            }
        }

        PlanningWeek week = planningWeekRepository.findByWeekStartDate(weekStart)
                .orElseGet(() -> planningWeekRepository.save(new PlanningWeek(weekStart, PlanningStatus.DRAFT)));
        List<PlanningDraftAssignment> previousDrafts = assignmentRepository.findByPlanningWeekId(week.getId()).stream()
                .map(this::toDraft)
                .toList();
        assignmentRepository.deleteByPlanningWeekIdAndLockedFalse(week.getId());

        Set<String> retainedLocked = assignmentRepository.findByPlanningWeekId(week.getId()).stream()
                .filter(PlanningAssignment::isLocked)
                .map(this::toDraft)
                .map(PlanningDraftAssignment::key)
                .collect(Collectors.toSet());
        Map<Long, Shift> shiftsById = context.shifts().stream()
                .collect(Collectors.toMap(Shift::getId, Function.identity()));
        for (PlanningDraftAssignment draft : drafts) {
            if (retainedLocked.contains(draft.key())) {
                continue;
            }
            PlanningAssignment entity = new PlanningAssignment(
                    week.getId(),
                    draft.agentId(),
                    shiftsById.get(draft.shiftId()),
                    draft.assignmentDate(),
                    draft.locked(),
                    draft.generated()
            );
            if (mode == ValidationMode.SUPERVISOR_OVERRIDE && !overrideWarnings.isEmpty()) {
                entity.markManuallyOverridden();
            }
            assignmentRepository.save(entity);
        }
        if (mode == ValidationMode.SUPERVISOR_OVERRIDE && !overrideWarnings.isEmpty()) {
            week.markManuallyOverridden();
            writeOverrideAudit(
                    week.getId(), supervisorIdentity, previousDrafts, drafts,
                    overrideWarnings, optionalOverrideReason(request.overrideReason())
            );
        }
        if (request.publish()) {
            week.publish();
        } else {
            week.markDraft();
        }
        planningWeekRepository.save(week);
        return getWeek(weekStart);
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyPlanningResponse validate(SaveWeeklyPlanningRequest request) {
        LocalDate weekStart = normalizeWeekStart(request.weekStartDate());
        GenerationContext context = loadContext(weekStart);
        List<PlanningDraftAssignment> drafts = draftsFromRequest(request, context);
        return buildResponse(
                context,
                drafts,
                validate(context, drafts, context.lockedKeys(), request.effectiveValidationMode()),
                context.lockedKeys()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyPlanningResponse getWeek(LocalDate weekStartDate) {
        LocalDate weekStart = normalizeWeekStart(weekStartDate);
        GenerationContext context = loadContext(weekStart);
        List<PlanningDraftAssignment> assignments = mergeVisibleAssignments(
                currentAssignments(weekStart).stream()
                        .filter(item -> !context.lockedOffDayKeys().contains(item.agentId() + "|" + item.assignmentDate()))
                        .toList(),
                context.lockedAssignments()
        );
        return buildResponse(
                context,
                assignments,
                validate(
                        context,
                        assignments,
                        context.lockedKeys(),
                        context.planningWeek() != null && context.planningWeek().isManuallyOverridden()
                                ? ValidationMode.SUPERVISOR_OVERRIDE
                                : ValidationMode.STRICT
                ),
                context.lockedKeys()
        );
    }

    @Override
    @Transactional
    public WeeklyPlanningResponse publish(Long planningWeekId) {
        PlanningWeek week = planningWeekRepository.findById(planningWeekId)
                .orElseThrow(() -> new IllegalArgumentException("Planning week " + planningWeekId + " was not found."));
        GenerationContext context = loadContext(week.getWeekStartDate());
        List<PlanningDraftAssignment> assignments = assignmentRepository.findByPlanningWeekId(planningWeekId).stream()
                .map(this::toDraft)
                .toList();
        List<PlanningProblemResponse> problems = validate(
                context,
                assignments,
                context.lockedKeys(),
                week.isManuallyOverridden() ? ValidationMode.SUPERVISOR_OVERRIDE : ValidationMode.STRICT
        );
        rejectErrors("Planning cannot be published because it violates mandatory rules.", problems);
        week.publish();
        planningWeekRepository.save(week);
        return buildResponse(context, assignments, problems, context.lockedKeys());
    }

    @Override
    @Transactional
    public WeeklyPlanningResponse setAssignmentLock(
            LocalDate weekStartDate,
            AssignmentLockRequest request,
            String supervisorIdentity
    ) {
        LocalDate weekStart = normalizeWeekStart(weekStartDate);
        if (request.assignmentDate().isBefore(weekStart)
                || request.assignmentDate().isAfter(weekStart.plusDays(6))) {
            throw new IllegalArgumentException("Lock date must belong to the selected week.");
        }
        PlanningAgent agent = agentRepository.findById(request.agentId())
                .filter(PlanningAgent::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Active planning agent was not found."));
        PlanningWeek week = planningWeekRepository.findByWeekStartDate(weekStart)
                .orElseGet(() -> planningWeekRepository.save(new PlanningWeek(weekStart, PlanningStatus.DRAFT)));
        int dayOfWeek = request.assignmentDate().getDayOfWeek().getValue();
        LocalDate freezeEndDate = request.endDate();
        if (request.locked() && freezeEndDate != null && freezeEndDate.isBefore(request.assignmentDate())) {
            throw new IllegalArgumentException("Freeze end date cannot be before the locked assignment date.");
        }
        deactivateActiveFreezes(agent.getId(), dayOfWeek, request.assignmentDate().minusDays(1));
        Optional<PlanningAssignment> assignment =
                assignmentRepository.findByPlanningWeekIdAndAgentIdAndAssignmentDate(
                        week.getId(), agent.getId(), request.assignmentDate());
        if (assignment.isPresent()) {
            PlanningAssignment existing = assignment.get();
            existing.setLocked(request.locked());
            assignmentRepository.save(existing);
            offDayLockRepository.findByPlanningWeekIdAndAgentIdAndAssignmentDate(
                    week.getId(), agent.getId(), request.assignmentDate()).ifPresent(offDayLockRepository::delete);
            if (request.locked()) {
                assignmentFreezeRepository.save(new PlanningAssignmentFreeze(
                        agent.getId(), dayOfWeek, existing.getShiftId(), request.assignmentDate(), freezeEndDate, supervisorIdentity));
            }
        } else if (request.locked() && request.shiftId() != null) {
            Shift shift = shiftRepository.findById(request.shiftId())
                    .filter(Shift::isActive)
                    .orElseThrow(() -> new IllegalArgumentException("Active planning shift was not found."));
            assignmentRepository.save(new PlanningAssignment(
                    week.getId(), agent.getId(), shift, request.assignmentDate(), true, false));
            assignmentFreezeRepository.save(new PlanningAssignmentFreeze(
                    agent.getId(), dayOfWeek, shift.getId(), request.assignmentDate(), freezeEndDate, supervisorIdentity));
        } else if (request.locked()) {
            offDayLockRepository.findByPlanningWeekIdAndAgentIdAndAssignmentDate(
                    week.getId(), agent.getId(), request.assignmentDate())
                    .orElseGet(() -> offDayLockRepository.save(new PlanningOffDayLock(
                            week.getId(), agent.getId(), request.assignmentDate(), supervisorIdentity)));
            assignmentFreezeRepository.save(new PlanningAssignmentFreeze(
                    agent.getId(), dayOfWeek, null, request.assignmentDate(), freezeEndDate, supervisorIdentity));
        } else {
            offDayLockRepository.findByPlanningWeekIdAndAgentIdAndAssignmentDate(
                    week.getId(), agent.getId(), request.assignmentDate()).ifPresent(offDayLockRepository::delete);
        }
        return getWeek(weekStart);
    }

    @Override
    @Transactional
    public WeeklyPlanningResponse setAgentUnavailability(
            LocalDate weekStartDate,
            AgentUnavailabilityRequest request
    ) {
        LocalDate weekStart = normalizeWeekStart(weekStartDate);
        if (request.date().isBefore(weekStart) || request.date().isAfter(weekStart.plusDays(6))) {
            throw new IllegalArgumentException("Unavailability date must belong to the selected week.");
        }
        PlanningAgent agent = agentRepository.findById(request.agentId())
                .filter(PlanningAgent::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Active planning agent was not found."));
        String reason = normalizeUnavailabilityReason(request.reason());
        Optional<AgentUnavailability> existing = unavailabilityRepository.findByAgentIdAndDate(
                agent.getId(), request.date());
        if (reason == null) {
            existing.ifPresent(unavailabilityRepository::delete);
        } else if (existing.isPresent()) {
            AgentUnavailability unavailability = existing.get();
            unavailability.setReason(reason);
            unavailabilityRepository.save(unavailability);
        } else {
            unavailabilityRepository.save(new AgentUnavailability(agent.getId(), request.date(), reason));
        }

        planningWeekRepository.findByWeekStartDate(weekStart).ifPresent(week -> {
            if (isBlockingUnavailability(reason)) {
                assignmentRepository.findByPlanningWeekIdAndAgentIdAndAssignmentDate(
                                week.getId(), agent.getId(), request.date())
                        .filter(assignment -> !assignment.isLocked())
                        .ifPresent(assignmentRepository::delete);
                offDayLockRepository.findByPlanningWeekIdAndAgentIdAndAssignmentDate(
                                week.getId(), agent.getId(), request.date())
                        .ifPresent(offDayLockRepository::delete);
            }
        });
        return getWeek(weekStart);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WeekendOffStatisticResponse> weekendOffStatistics(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new IllegalArgumentException("A valid statistics date range is required.");
        }
        List<PlanningDraftAssignment> assignments = assignmentRepository.findByAssignmentDateBetween(from, to).stream()
                .map(this::toDraft)
                .toList();
        Set<LocalDate> scheduledWeekendStarts = planningWeekRepository
                .findByWeekStartDateBetween(
                        normalizeWeekStart(from).minusWeeks(1),
                        normalizeWeekStart(to))
                .stream()
                .map(PlanningWeek::getWeekStartDate)
                .map(start -> start.plusDays(5))
                .filter(saturday -> !saturday.isBefore(from) && !saturday.plusDays(1).isAfter(to))
                .collect(Collectors.toSet());
        return agentRepository.findByActiveTrueOrderByFullName().stream().map(agent -> {
            Set<LocalDate> worked = assignments.stream()
                    .filter(item -> item.agentId().equals(agent.getId()))
                    .map(PlanningDraftAssignment::assignmentDate)
                    .collect(Collectors.toSet());
            List<LocalDate> completeWeekendOffDates = scheduledWeekendStarts.stream()
                    .filter(date -> !worked.contains(date) && !worked.contains(date.plusDays(1)))
                    .sorted()
                    .toList();
            return new WeekendOffStatisticResponse(
                    agent.getId(),
                    agent.getFullName(),
                    from,
                    to,
                    scheduledWeekendStarts.stream().filter(date -> !worked.contains(date)).count(),
                    scheduledWeekendStarts.stream().filter(date -> !worked.contains(date.plusDays(1))).count(),
                    completeWeekendOffDates.size(),
                    completeWeekendOffDates.stream().max(LocalDate::compareTo).orElse(null),
                    completeWeekendOffDates
            );
        }).toList();
    }

    private GenerationResult generateAttempt(GenerationContext context, int attempt) {
        List<PlanningProblemResponse> problems = new ArrayList<>();
        Map<Long, Set<LocalDate>> workDays = assignWorkDays(context, attempt);
        if (workDays.isEmpty()) {
            problems.add(problem(
                    "OFF_DAY_ALLOCATION_FAILED",
                    "Unable to allocate exactly 2 OFF days per agent while preserving coverage, leave, locked work, and consecutive-day limits.",
                    null,
                    null
            ));
            return new GenerationResult(context.lockedAssignments(), problems, context.lockedKeys());
        }

        List<PlanningDraftAssignment> draft = new ArrayList<>(context.lockedAssignments());
        Set<Long> sundayWorkers = context.agents().stream()
                .filter(agent -> workDays.getOrDefault(agent.getId(), Set.of())
                        .contains(context.weekStart().plusDays(6)))
                .map(PlanningAgent::getId)
                .collect(Collectors.toSet());
        for (int dayIndex = 0; dayIndex < 7; dayIndex++) {
            LocalDate date = context.weekStart().plusDays(dayIndex);
            List<PlanningAgent> workers = context.agents().stream()
                    .filter(agent -> workDays.getOrDefault(agent.getId(), Set.of()).contains(date))
                    .toList();
            if (!assignDay(context, date, workers, sundayWorkers, draft, attempt, problems)) {
                break;
            }
        }
        return new GenerationResult(draft, problems, context.lockedKeys());
    }

    private Map<Long, Set<LocalDate>> assignWorkDays(GenerationContext context, int attempt) {
        List<PlanningAgent> orderedAgents = new ArrayList<>(context.agents());
        orderedAgents.sort(Comparator
                .comparingInt((PlanningAgent agent) -> availableOffPatterns(context, agent).size())
                .thenComparing((PlanningAgent left, PlanningAgent right) -> Long.compare(
                        historicalWeekendOffCount(right.getId(), context),
                        historicalWeekendOffCount(left.getId(), context)
                ))
                .thenComparing(PlanningAgent::getFullName));
        int[] dailyWorkers = new int[7];
        Map<Long, Set<LocalDate>> selected = new LinkedHashMap<>();
        if (searchWorkPatterns(context, orderedAgents, 0, dailyWorkers, selected, attempt)) {
            return selected;
        }
        return Map.of();
    }

    private boolean searchWorkPatterns(
            GenerationContext context,
            List<PlanningAgent> agents,
            int index,
            int[] dailyWorkers,
            Map<Long, Set<LocalDate>> selected,
            int attempt
    ) {
        if (index == agents.size()) {
            for (int day = 0; day < dailyWorkers.length; day++) {
                if (day == 6 && dailyWorkers[day] != 5) {
                    return false;
                }
                if (day < 6 && dailyWorkers[day] < 5) {
                    return false;
                }
            }
            long completeWeekendOff = selected.values().stream()
                    .filter(workDays -> !workDays.contains(context.weekStart().plusDays(5))
                            && !workDays.contains(context.weekStart().plusDays(6)))
                    .count();
            if (completeWeekendOff < MIN_COMPLETE_WEEKEND_OFF_PER_WEEK) {
                return false;
            }
            return true;
        }

        PlanningAgent agent = agents.get(index);
        List<Set<LocalDate>> patterns = new ArrayList<>(availableOffPatterns(context, agent));
        patterns.sort(Comparator
                .comparingInt((Set<LocalDate> workDays) -> workPatternScore(context, agent, workDays, dailyWorkers))
                .thenComparingInt(workDays -> rotationKey(agent.getId(), context.weekStart(), attempt, workDays)));

        int remainingAfter = agents.size() - index - 1;
        for (Set<LocalDate> workDays : patterns) {
            for (LocalDate date : workDays) {
                dailyWorkers[(int) (date.toEpochDay() - context.weekStart().toEpochDay())]++;
            }
            boolean canStillCover = true;
            for (int day = 0; day < dailyWorkers.length; day++) {
                int count = dailyWorkers[day];
                int minimum = day == 6 ? 5 : 5;
                if (count + remainingAfter < minimum || (day == 6 && count > 5)) {
                    canStillCover = false;
                    break;
                }
            }
            if (canStillCover) {
                selected.put(agent.getId(), workDays);
                if (searchWorkPatterns(context, agents, index + 1, dailyWorkers, selected, attempt)) {
                    return true;
                }
                selected.remove(agent.getId());
            }
            for (LocalDate date : workDays) {
                dailyWorkers[(int) (date.toEpochDay() - context.weekStart().toEpochDay())]--;
            }
        }
        return false;
    }

    private List<Set<LocalDate>> availableOffPatterns(GenerationContext context, PlanningAgent agent) {
        List<Set<LocalDate>> patterns = new ArrayList<>();
        Set<LocalDate> unavailable = context.unavailableDays().getOrDefault(agent.getId(), Set.of());
        Set<LocalDate> lockedWork = context.lockedAssignments().stream()
                .filter(item -> item.agentId().equals(agent.getId()))
                .map(PlanningDraftAssignment::assignmentDate)
                .collect(Collectors.toSet());
        Set<LocalDate> lockedOff = context.lockedOffDays().stream()
                .filter(item -> item.getAgentId().equals(agent.getId()))
                .map(PlanningOffDayLock::getAssignmentDate)
                .collect(Collectors.toSet());
        context.lockedOffDayKeys().stream()
                .map(this::parseLockKey)
                .filter(item -> item.agentId().equals(agent.getId()))
                .map(LockedOffDayKey::date)
                .forEach(lockedOff::add);
        List<LocalDate> days = weekDays(context.weekStart());
        LocalDate sunday = context.weekStart().plusDays(6);
        for (int first = 0; first < days.size(); first++) {
            for (int second = first + 1; second < days.size(); second++) {
                Set<LocalDate> off = Set.of(days.get(first), days.get(second));
                if (!off.containsAll(unavailable)
                        || !off.containsAll(lockedOff)
                        || off.stream().anyMatch(lockedWork::contains)) {
                    continue;
                }
                Set<LocalDate> work = days.stream().filter(day -> !off.contains(day)).collect(Collectors.toSet());
                if (agent.isFixedSco() && !work.contains(sunday)) {
                    continue;
                }
                if (work.size() == REQUIRED_WORK_DAYS && respectsConsecutiveLimit(agent.getId(), context, work)) {
                    patterns.add(work);
                }
            }
        }
        return patterns;
    }

    private boolean respectsConsecutiveLimit(Long agentId, GenerationContext context, Set<LocalDate> workDays) {
        Set<LocalDate> worked = context.history().stream()
                .filter(item -> item.agentId().equals(agentId))
                .map(PlanningDraftAssignment::assignmentDate)
                .filter(date -> !date.isBefore(context.weekStart().minusDays(6)))
                .collect(Collectors.toSet());
        worked.addAll(workDays);
        int consecutive = 0;
        for (LocalDate date = context.weekStart().minusDays(6);
             !date.isAfter(context.weekStart().plusDays(6));
             date = date.plusDays(1)) {
            consecutive = worked.contains(date) ? consecutive + 1 : 0;
            if (consecutive > 5) {
                return false;
            }
        }
        return true;
    }

    private int workPatternScore(
            GenerationContext context,
            PlanningAgent agent,
            Set<LocalDate> workDays,
            int[] dailyWorkers
    ) {
        int score = workDays.stream()
                .mapToInt(date -> dailyWorkers[(int) (date.toEpochDay() - context.weekStart().toEpochDay())] * 10)
                .sum();
        boolean weekendOff = !workDays.contains(context.weekStart().plusDays(5))
                && !workDays.contains(context.weekStart().plusDays(6));
        List<LocalDate> offDays = weekDays(context.weekStart()).stream()
                .filter(day -> !workDays.contains(day))
                .sorted()
                .toList();
        Set<DayOfWeek> offWeekdays = offDays.stream()
                .map(LocalDate::getDayOfWeek)
                .collect(Collectors.toSet());
        boolean pairedOffDays = offDays.size() == 2
                && offDays.get(1).equals(offDays.get(0).plusDays(1));
        if (pairedOffDays) {
            score -= 35;
        }

        Set<DayOfWeek> previousWeekOffDays = previousWeekOffDays(agent.getId(), context);
        long repeatedOffDays = offWeekdays.stream().filter(previousWeekOffDays::contains).count();
        score += (int) repeatedOffDays * 180;
        if (previousWeekOffDays.size() == 2 && previousWeekOffDays.equals(offWeekdays)) {
            score += 420;
        }

        Map<DayOfWeek, Long> historicalOffCounts = historicalOffCounts(agent.getId(), context);
        score += offWeekdays.stream()
                .mapToInt(day -> historicalOffCounts.getOrDefault(day, 0L).intValue() * 24)
                .sum();

        int preferredPairStart = Math.floorMod(
                Long.hashCode(agent.getId())
                        + context.weekStart().get(WeekFields.ISO.weekOfWeekBasedYear()),
                6
        );
        Set<DayOfWeek> preferredPair = Set.of(
                DayOfWeek.of(preferredPairStart + 1),
                DayOfWeek.of(preferredPairStart + 2)
        );
        if (offWeekdays.equals(preferredPair)) {
            score -= 90;
        }

        if (weekendOff) {
            long historicalWeekendOff = historicalWeekendOffCount(agent.getId(), context);
            long minimumHistoricalWeekendOff = minimumHistoricalWeekendOffCount(context);
            score += historicalWeekendOff == 0 ? -180 : (int) historicalWeekendOff * 260;
            score += (int) (historicalWeekendOff - minimumHistoricalWeekendOff) * 160;
        }
        return score;
    }

    private long historicalWeekendOffCount(Long agentId, GenerationContext context) {
        return PlanningValidationServiceImpl.countFullWeekendOff(
                agentId,
                context.weekStart().minusWeeks(8),
                context.weekStart().minusDays(1),
                context.history()
        );
    }

    private long minimumHistoricalWeekendOffCount(GenerationContext context) {
        return context.agents().stream()
                .mapToLong(agent -> historicalWeekendOffCount(agent.getId(), context))
                .min()
                .orElse(0);
    }


    private Set<DayOfWeek> previousWeekOffDays(Long agentId, GenerationContext context) {
        LocalDate previousStart = context.weekStart().minusDays(7);
        Set<LocalDate> worked = context.history().stream()
                .filter(item -> item.agentId().equals(agentId))
                .map(PlanningDraftAssignment::assignmentDate)
                .filter(date -> !date.isBefore(previousStart) && date.isBefore(context.weekStart()))
                .collect(Collectors.toSet());
        if (worked.isEmpty()) {
            return Set.of();
        }
        return weekDays(previousStart).stream()
                .filter(day -> !worked.contains(day))
                .map(LocalDate::getDayOfWeek)
                .collect(Collectors.toSet());
    }

    private Map<DayOfWeek, Long> historicalOffCounts(Long agentId, GenerationContext context) {
        Map<DayOfWeek, Long> counts = new HashMap<>();
        for (int weeksBack = 1; weeksBack <= 4; weeksBack++) {
            LocalDate historicalWeekStart = context.weekStart().minusWeeks(weeksBack);
            Set<LocalDate> worked = context.history().stream()
                    .filter(item -> item.agentId().equals(agentId))
                    .map(PlanningDraftAssignment::assignmentDate)
                    .filter(date -> !date.isBefore(historicalWeekStart)
                            && !date.isAfter(historicalWeekStart.plusDays(6)))
                    .collect(Collectors.toSet());
            if (worked.isEmpty()) {
                continue;
            }
            weekDays(historicalWeekStart).stream()
                    .filter(day -> !worked.contains(day))
                    .map(LocalDate::getDayOfWeek)
                    .forEach(day -> counts.merge(day, 1L, Long::sum));
        }
        return counts;
    }

    private boolean assignDay(
            GenerationContext context,
            LocalDate date,
            List<PlanningAgent> workers,
            Set<Long> sundayWorkers,
            List<PlanningDraftAssignment> draft,
            int attempt,
            List<PlanningProblemResponse> problems
    ) {
        List<PlanningDraftAssignment> existing = draft.stream()
                .filter(item -> item.assignmentDate().equals(date))
                .toList();
        Set<Long> assignedAgents = existing.stream().map(PlanningDraftAssignment::agentId).collect(Collectors.toSet());
        Set<Long> workerIds = workers.stream().map(PlanningAgent::getId).collect(Collectors.toSet());
        if (existing.size() > workers.size() || !workerIds.containsAll(assignedAgents)) {
            problems.add(problem("INVALID_LOCKED_COVERAGE", "Locked assignments make daily coverage impossible.", null, date));
            return false;
        }

        if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return assignSunday(context, date, workers, sundayWorkers, draft, assignedAgents, attempt, problems);
        }

        if (existing.stream().anyMatch(item -> !STANDARD_SHIFT_CODES.contains(item.shiftCode()))) {
            problems.add(problem("INVALID_LOCKED_WEEKDAY_SHIFT",
                    "A locked Monday-Saturday assignment uses a non-standard shift.", null, date));
            return false;
        }
        Map<String, Integer> required = new LinkedHashMap<>();
        required.put("OPEN_03_12", 2);
        required.put("NORMAL_05_14", 1);
        required.put("CLOSE_12_21", 1);
        required.put("CLOSE_13_22", 1);
        for (Map.Entry<String, Integer> slot : required.entrySet()) {
            long alreadyAssigned = existing.stream()
                    .filter(item -> item.shiftCode().equals(slot.getKey()))
                    .count();
            if (alreadyAssigned > slot.getValue()) {
                problems.add(problem("INVALID_LOCKED_COVERAGE",
                        "Too many locked assignments for " + slot.getKey() + ".", null, date));
                return false;
            }
            Shift shift = shiftByCode(context, slot.getKey()).orElseThrow();
            while (alreadyAssigned++ < slot.getValue()) {
                if (!assignRequiredShift(context, workers, sundayWorkers, assignedAgents, draft, shift, date, attempt)) {
                    problems.add(problem("NO_FEASIBLE_AGENT",
                            "No feasible agent is available for required shift " + slot.getKey() + ".",
                            null, date));
                    return false;
                }
            }
        }

        List<Shift> intermediate = List.of(
                shiftByCode(context, "NORMAL_07_16").orElseThrow(),
                shiftByCode(context, "NORMAL_08_17").orElseThrow(),
                shiftByCode(context, "NORMAL_09_18").orElseThrow()
        );
        for (PlanningAgent worker : workers) {
            if (assignedAgents.contains(worker.getId())) {
                continue;
            }
            Optional<Shift> normal = intermediate.stream()
                    .filter(shift -> hasRequiredRest(worker.getId(), date, shift, context, draft))
                    .min(Comparator
                            .comparingInt((Shift shift) -> assignmentStyleScore(
                                    worker.getId(), shift, date, context.history(), draft))
                            .thenComparingInt(shift -> rotationKey(
                                    worker.getId(),
                                    date,
                                    attempt,
                                    Set.of(date.plusDays(shift.getStartTime().getHour() % 7))
                            )));
            if (normal.isEmpty()) {
                problems.add(problem(
                        "NO_NORMAL_SHIFT",
                        "No normal shift preserves the required rest period for " + worker.getFullName() + ".",
                        worker.getId(),
                        date
                ));
                return false;
            }
            addDraft(worker, normal.get(), date, draft);
            assignedAgents.add(worker.getId());
        }
        return true;
    }

    private boolean assignSunday(
            GenerationContext context,
            LocalDate date,
            List<PlanningAgent> workers,
            Set<Long> sundayWorkers,
            List<PlanningDraftAssignment> draft,
            Set<Long> assignedAgents,
            int attempt,
            List<PlanningProblemResponse> problems
    ) {
        if (workers.size() != 5) {
            problems.add(problem("INVALID_SUNDAY_WORKER_COUNT",
                    "Sunday requires exactly 5 working agents.", null, date));
            return false;
        }
        List<PlanningDraftAssignment> existing = draft.stream()
                .filter(item -> item.assignmentDate().equals(date))
                .toList();
        if (existing.stream().anyMatch(item -> !item.shiftCode().equals("NORMAL_05_14")
                && !item.shiftCode().equals("SCO_11_20"))) {
            problems.add(problem("INVALID_LOCKED_SUNDAY_SHIFT",
                    "Sunday only permits NORMAL_05_14 and SCO_11_20.", null, date));
            return false;
        }
        PlanningAgent fixed = context.agents().stream().filter(PlanningAgent::isFixedSco).findFirst().orElse(null);
        Shift sco = shiftByCode(context, "SCO_11_20").orElseThrow();
        Shift early = shiftByCode(context, "NORMAL_05_14").orElseThrow();
        if (fixed != null) {
            PlanningDraftAssignment fixedExisting = existing.stream()
                    .filter(item -> item.agentId().equals(fixed.getId()))
                    .findFirst()
                    .orElse(null);
            if (fixedExisting != null && !fixedExisting.shiftCode().equals("SCO_11_20")) {
                problems.add(problem("FIXED_SCO_LOCK_CONFLICT",
                        "The fixed SCO agent has a conflicting locked Sunday assignment.", fixed.getId(), date));
                return false;
            }
            if (fixedExisting != null) {
                assignedAgents.add(fixed.getId());
            } else if (workers.stream().noneMatch(agent -> agent.getId().equals(fixed.getId()))
                    || !hasRequiredRest(fixed.getId(), date, sco, context, draft)) {
                problems.add(problem("FIXED_SCO_UNAVAILABLE",
                        "The configured fixed SCO agent cannot cover Sunday.", fixed.getId(), date));
            } else {
                addDraft(fixed, sco, date, draft);
                assignedAgents.add(fixed.getId());
            }
        }

        long scoCount = draft.stream()
                .filter(item -> item.assignmentDate().equals(date) && item.shiftCode().equals("SCO_11_20"))
                .count();
        if (scoCount > 2) {
            problems.add(problem("INVALID_LOCKED_SCO_COVERAGE",
                    "More than two Sunday SCO assignments are locked.", null, date));
            return false;
        }
        while (scoCount++ < 2) {
            Optional<PlanningAgent> rotating = workers.stream()
                    .filter(agent -> fixed == null || !agent.getId().equals(fixed.getId()))
                    .filter(agent -> !assignedAgents.contains(agent.getId()))
                    .filter(agent -> hasRequiredRest(agent.getId(), date, sco, context, draft))
                    .min(Comparator
                            .comparingInt((PlanningAgent agent) ->
                                    shiftUseCount(agent.getId(), "SCO_11_20", context.history(), draft) * 100
                                            + weekendsWorked(agent.getId(), context.history()) * 10)
                            .thenComparing(PlanningAgent::getFullName));
            if (rotating.isEmpty()) {
                problems.add(problem("NO_ROTATING_SCO_AGENT",
                        "No different rotating agent can cover Sunday SCO.", null, date));
                return false;
            }
            addDraft(rotating.get(), sco, date, draft);
            assignedAgents.add(rotating.get().getId());
        }

        long earlyCount = draft.stream()
                .filter(item -> item.assignmentDate().equals(date) && item.shiftCode().equals("NORMAL_05_14"))
                .count();
        if (earlyCount > 3) {
            problems.add(problem("INVALID_LOCKED_SUNDAY_COVERAGE",
                    "More than three Sunday 05:00 assignments are locked.", null, date));
            return false;
        }
        while (earlyCount++ < 3) {
            if (!assignRequiredShift(context, workers, sundayWorkers, assignedAgents, draft, early, date, attempt)) {
                problems.add(problem("NO_SUNDAY_EARLY_AGENT",
                        "No feasible agent can cover Sunday 05:00-14:00.", null, date));
                return false;
            }
        }
        return assignedAgents.size() == 5;
    }

    private boolean assignRequiredShift(
            GenerationContext context,
            List<PlanningAgent> workers,
            Set<Long> sundayWorkers,
            Set<Long> assignedAgents,
            List<PlanningDraftAssignment> draft,
            Shift shift,
            LocalDate date,
            int attempt
    ) {
        Optional<PlanningAgent> candidate = chooseAgent(
                context, workers, sundayWorkers, assignedAgents, draft, shift, date, attempt
        );
        candidate.ifPresent(agent -> {
            addDraft(agent, shift, date, draft);
            assignedAgents.add(agent.getId());
        });
        return candidate.isPresent();
    }

    private Optional<Shift> shiftByCode(GenerationContext context, String code) {
        return context.shifts().stream().filter(shift -> shift.getCode().equals(code)).findFirst();
    }

    private int weekendsWorked(Long agentId, List<PlanningDraftAssignment> history) {
        return (int) history.stream()
                .filter(item -> item.agentId().equals(agentId))
                .filter(item -> item.assignmentDate().getDayOfWeek() == DayOfWeek.SATURDAY
                        || item.assignmentDate().getDayOfWeek() == DayOfWeek.SUNDAY)
                .map(item -> YearMonth.from(item.assignmentDate()) + "|" + item.assignmentDate().get(WeekFields.ISO.weekOfWeekBasedYear()))
                .distinct()
                .count();
    }

    private Optional<PlanningAgent> chooseAgent(
            GenerationContext context,
            List<PlanningAgent> workers,
            Set<Long> sundayWorkers,
            Set<Long> assignedAgents,
            List<PlanningDraftAssignment> draft,
            Shift shift,
            LocalDate date,
            int attempt
    ) {
        return workers.stream()
                .filter(agent -> !assignedAgents.contains(agent.getId()))
                .filter(agent -> hasRequiredRest(agent.getId(), date, shift, context, draft))
                .min(Comparator
                        .comparingInt((PlanningAgent agent) -> assignmentStyleScore(
                                agent.getId(), shift, date, context.history(), draft
                        ) + saturdayToSundayPenalty(agent.getId(), shift, date, sundayWorkers))
                        .thenComparingInt(agent -> rotationKey(agent.getId(), date, attempt, Set.of(date))));
    }

    private int saturdayToSundayPenalty(
            Long agentId,
            Shift shift,
            LocalDate date,
            Set<Long> sundayWorkers
    ) {
        return date.getDayOfWeek() == DayOfWeek.SATURDAY
                && sundayWorkers.contains(agentId)
                && shift.getEndTime().isAfter(java.time.LocalTime.of(19, 0))
                ? 10_000
                : 0;
    }

    private int assignmentStyleScore(
            Long agentId,
            Shift shift,
            LocalDate date,
            List<PlanningDraftAssignment> history,
            List<PlanningDraftAssignment> draft
    ) {
        List<PlanningDraftAssignment> currentWeekAgentAssignments = draft.stream()
                .filter(item -> item.agentId().equals(agentId))
                .filter(item -> Math.abs(Duration.between(
                        item.assignmentDate().atStartOfDay(),
                        date.atStartOfDay()).toDays()) <= 6)
                .toList();
        int score = categoryUseCount(agentId, shift.getCategory(), history, draft) * 5
                + shiftUseCount(agentId, shift.getCode(), history, draft) * 2;
        if (!currentWeekAgentAssignments.isEmpty()) {
            int averageStartGapMinutes = (int) currentWeekAgentAssignments.stream()
                    .mapToInt(item -> (int) Math.abs(ChronoUnit.MINUTES.between(
                            item.startAt().toLocalTime(),
                            shift.getStartTime())))
                    .average()
                    .orElse(0);
            score += averageStartGapMinutes / 6;
            boolean sameCategoryThisWeek = currentWeekAgentAssignments.stream()
                    .anyMatch(item -> item.shiftCategory() == shift.getCategory());
            boolean sameShiftThisWeek = currentWeekAgentAssignments.stream()
                    .anyMatch(item -> item.shiftCode().equals(shift.getCode()));
            if (!sameCategoryThisWeek) {
                score += 24;
            }
            if (sameShiftThisWeek) {
                score -= 10;
            }
        }
        if (STANDARD_SHIFT_CODES.contains(shift.getCode())
                && java.util.stream.Stream.concat(history.stream(), draft.stream())
                .noneMatch(item -> item.agentId().equals(agentId)
                        && item.shiftCode().equals(shift.getCode()))) {
            score -= 35;
        }
        Optional<PlanningDraftAssignment> previousDay = java.util.stream.Stream
                .concat(history.stream(), draft.stream())
                .filter(item -> item.agentId().equals(agentId))
                .filter(item -> item.assignmentDate().equals(date.minusDays(1)))
                .findFirst();
        if (previousDay.isPresent()) {
            PlanningDraftAssignment previous = previousDay.get();
            if (previous.shiftCode().equals(shift.getCode())) {
                score -= 28;
            } else if (previous.shiftCategory() == shift.getCategory()) {
                score -= 14;
            } else {
                score += 8;
            }
        }
        return score;
    }

    private String normalizeUnavailabilityReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return null;
        }
        String normalized = reason.trim().toUpperCase();
        if (normalized.equals("CONGÉ") || normalized.equals("CONGE") || normalized.equals("LEAVE")) {
            return "CONGÉ";
        }
        if (normalized.equals("ABSENT") || normalized.equals("ABSENCE")) {
            return "ABSENT";
        }
        if (normalized.equals("TELETRAVAIL") || normalized.equals("TT") || normalized.equals("REMOTE")) {
            return "TELETRAVAIL";
        }
        throw new IllegalArgumentException("Unavailability reason must be CONGE, ABSENT, or TELETRAVAIL.");
    }

    private boolean isBlockingUnavailability(String reason) {
        return reason != null && !reason.equals("TELETRAVAIL");
    }

    private boolean hasRequiredRest(
            Long agentId,
            LocalDate date,
            Shift shift,
            GenerationContext context,
            List<PlanningDraftAssignment> draft
    ) {
        LocalDateTime candidateStart = date.atTime(shift.getStartTime());
        LocalDateTime candidateEnd = date.atTime(shift.getEndTime());
        List<PlanningDraftAssignment> relevant = new ArrayList<>(context.history());
        relevant.addAll(draft);
        relevant.addAll(nextWeekFrozenAssignments(context, agentId, date));
        boolean enoughRestBefore = relevant.stream()
                .filter(item -> item.agentId().equals(agentId))
                .filter(item -> item.endAt().isBefore(candidateStart) || item.endAt().equals(candidateStart))
                .max(Comparator.comparing(PlanningDraftAssignment::endAt))
                .map(previous -> Duration.between(previous.endAt(), candidateStart).toHours() >= 10)
                .orElse(true);
        if (!enoughRestBefore) {
            return false;
        }
        return relevant.stream()
                .filter(item -> item.agentId().equals(agentId))
                .filter(item -> item.startAt().isAfter(candidateEnd) || item.startAt().equals(candidateEnd))
                .min(Comparator.comparing(PlanningDraftAssignment::startAt))
                .map(next -> Duration.between(candidateEnd, next.startAt()).toHours() >= 10)
                .orElse(true);
    }

    private List<PlanningDraftAssignment> nextWeekFrozenAssignments(
            GenerationContext context,
            Long agentId,
            LocalDate date
    ) {
        if (date.getDayOfWeek() != DayOfWeek.SUNDAY) {
            return List.of();
        }
        LocalDate nextWeekStart = date.plusDays(1);
        List<PlanningDraftAssignment> futureFrozen = new ArrayList<>();
        futureFrozen.addAll(recurringFrozenAssignments(nextWeekStart, context.agents(), context.shifts()));
        futureFrozen.addAll(currentWeekLockedAssignmentsProjectedToNextWeek(context));
        futureFrozen.addAll(currentAssignments(nextWeekStart).stream()
                .filter(PlanningDraftAssignment::locked)
                .toList());
        return futureFrozen.stream()
                .filter(item -> item.agentId().equals(agentId))
                .collect(Collectors.toMap(
                        item -> item.agentId() + "|" + item.assignmentDate(),
                        Function.identity(),
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ))
                .values()
                .stream()
                .toList();
    }

    private List<PlanningDraftAssignment> currentWeekLockedAssignmentsProjectedToNextWeek(GenerationContext context) {
        Map<Long, PlanningAgent> agentsById = context.agents().stream()
                .collect(Collectors.toMap(PlanningAgent::getId, Function.identity()));
        Map<Long, Shift> shiftsById = context.shifts().stream()
                .collect(Collectors.toMap(Shift::getId, Function.identity()));
        return context.lockedAssignments().stream()
                .map(item -> {
                    PlanningAgent agent = agentsById.get(item.agentId());
                    Shift shift = shiftsById.get(item.shiftId());
                    if (agent == null || shift == null) {
                        return null;
                    }
                    return PlanningDraftAssignment.of(
                            null,
                            agent.getId(),
                            agent.getFullName(),
                            shift,
                            item.assignmentDate().plusWeeks(1),
                            true,
                            false
                    );
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private void addDraft(PlanningAgent agent, Shift shift, LocalDate date, List<PlanningDraftAssignment> draft) {
        draft.add(PlanningDraftAssignment.of(null, agent.getId(), agent.getFullName(), shift, date, false, true));
    }

    private int categoryUseCount(
            Long agentId,
            ShiftCategory category,
            List<PlanningDraftAssignment> history,
            List<PlanningDraftAssignment> draft
    ) {
        return (int) java.util.stream.Stream.concat(history.stream(), draft.stream())
                .filter(item -> item.agentId().equals(agentId) && item.shiftCategory() == category)
                .count();
    }

    private int shiftUseCount(
            Long agentId,
            String shiftCode,
            List<PlanningDraftAssignment> history,
            List<PlanningDraftAssignment> draft
    ) {
        return (int) java.util.stream.Stream.concat(history.stream(), draft.stream())
                .filter(item -> item.agentId().equals(agentId) && item.shiftCode().equals(shiftCode))
                .count();
    }

    private int rotationKey(Long agentId, LocalDate date, int attempt, Set<LocalDate> pattern) {
        int week = date.get(WeekFields.ISO.weekOfWeekBasedYear());
        return Math.floorMod(Long.hashCode(agentId) * 31 + week * 17 + attempt * 13 + pattern.hashCode(), 10_007);
    }

    private List<PlanningDraftAssignment> draftsFromRequest(
            SaveWeeklyPlanningRequest request,
            GenerationContext context
    ) {
        Map<Long, Shift> shifts = context.shifts().stream().collect(Collectors.toMap(Shift::getId, Function.identity()));
        Map<Long, String> names = context.agents().stream()
                .collect(Collectors.toMap(PlanningAgent::getId, PlanningAgent::getFullName));
        List<PlanningDraftAssignment> drafts = new ArrayList<>();
        for (AssignmentDraftRequest requestDraft : request.assignments()) {
            Shift shift = shifts.get(requestDraft.shiftId());
            if (shift == null) {
                drafts.add(new PlanningDraftAssignment(
                        requestDraft.id(),
                        requestDraft.agentId(),
                        names.getOrDefault(requestDraft.agentId(), "Agent " + requestDraft.agentId()),
                        requestDraft.shiftId(),
                        "UNKNOWN",
                        ShiftCategory.NORMAL,
                        requestDraft.assignmentDate(),
                        requestDraft.assignmentDate().atStartOfDay(),
                        requestDraft.assignmentDate().atStartOfDay(),
                        0,
                        requestDraft.locked(),
                        requestDraft.generated()
                ));
            } else {
                drafts.add(PlanningDraftAssignment.of(
                        requestDraft.id(),
                        requestDraft.agentId(),
                        names.getOrDefault(requestDraft.agentId(), "Agent " + requestDraft.agentId()),
                        shift,
                        requestDraft.assignmentDate(),
                        requestDraft.locked(),
                        requestDraft.generated()
                ));
            }
        }
        return drafts;
    }

    private List<PlanningDraftAssignment> recurringFrozenAssignments(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> shifts
    ) {
        Map<Long, PlanningAgent> agentsById = agents.stream()
                .collect(Collectors.toMap(PlanningAgent::getId, Function.identity()));
        Map<Long, Shift> shiftsById = shifts.stream()
                .collect(Collectors.toMap(Shift::getId, Function.identity()));
        return activeFreezesForWeek(weekStart).stream()
                .filter(freeze -> freeze.getShiftId() != null)
                .map(freeze -> {
                    LocalDate date = dateForFreeze(weekStart, freeze);
                    PlanningAgent agent = agentsById.get(freeze.getAgentId());
                    Shift shift = shiftsById.get(freeze.getShiftId());
                    if (date == null || agent == null || shift == null) {
                        return null;
                    }
                    return PlanningDraftAssignment.of(
                            null,
                            agent.getId(),
                            agent.getFullName(),
                            shift,
                            date,
                            true,
                            false
                    );
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private Set<String> recurringFrozenOffDayKeys(LocalDate weekStart) {
        return activeFreezesForWeek(weekStart).stream()
                .filter(freeze -> freeze.getShiftId() == null)
                .map(freeze -> {
                    LocalDate date = dateForFreeze(weekStart, freeze);
                    return date == null ? null : freeze.getAgentId() + "|" + date;
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private List<PlanningDraftAssignment> inferredFrozenAssignmentsFromPreviousLockedWeek(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> shifts
    ) {
        Map<Long, PlanningAgent> agentsById = agents.stream()
                .collect(Collectors.toMap(PlanningAgent::getId, Function.identity()));
        Map<Long, Shift> shiftsById = shifts.stream()
                .collect(Collectors.toMap(Shift::getId, Function.identity()));
        return previousLockedWeek(weekStart)
                .map(previousWeek -> assignmentRepository.findByPlanningWeekId(previousWeek.getId()).stream()
                        .filter(PlanningAssignment::isLocked)
                        .map(assignment -> {
                            PlanningAgent agent = agentsById.get(assignment.getAgentId());
                            Shift shift = shiftsById.get(assignment.getShiftId());
                            if (agent == null || shift == null) {
                                return null;
                            }
                            LocalDate projectedDate = weekStart.plusDays(
                                    assignment.getAssignmentDate().getDayOfWeek().getValue() - 1L);
                            return PlanningDraftAssignment.of(
                                    null,
                                    agent.getId(),
                                    agent.getFullName(),
                                    shift,
                                    projectedDate,
                                    true,
                                    false
                            );
                        })
                        .filter(java.util.Objects::nonNull)
                        .toList())
                .orElse(List.of());
    }

    private Set<String> inferredFrozenOffDayKeysFromPreviousLockedWeek(LocalDate weekStart) {
        return previousLockedWeek(weekStart)
                .map(previousWeek -> offDayLockRepository.findByPlanningWeekId(previousWeek.getId()).stream()
                        .map(lock -> {
                            LocalDate projectedDate = weekStart.plusDays(
                                    lock.getAssignmentDate().getDayOfWeek().getValue() - 1L);
                            return lock.getAgentId() + "|" + projectedDate;
                        })
                        .collect(Collectors.toSet()))
                .orElse(Set.of());
    }

    private Optional<PlanningWeek> previousLockedWeek(LocalDate weekStart) {
        return planningWeekRepository.findByWeekStartDateBetween(weekStart.minusWeeks(12), weekStart.minusWeeks(1))
                .stream()
                .sorted(Comparator.comparing(PlanningWeek::getWeekStartDate).reversed())
                .filter(week -> assignmentRepository.findByPlanningWeekId(week.getId()).stream()
                        .anyMatch(PlanningAssignment::isLocked)
                        || !offDayLockRepository.findByPlanningWeekId(week.getId()).isEmpty())
                .findFirst();
    }

    private List<PlanningAssignmentFreeze> activeFreezesForWeek(LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return assignmentFreezeRepository.findByActiveTrueAndStartDateLessThanEqual(weekEnd).stream()
                .filter(freeze -> {
                    LocalDate date = dateForFreeze(weekStart, freeze);
                    return date != null
                            && !date.isBefore(freeze.getStartDate())
                            && (freeze.getEndDate() == null || !date.isAfter(freeze.getEndDate()));
                })
                .toList();
    }

    private LocalDate dateForFreeze(LocalDate weekStart, PlanningAssignmentFreeze freeze) {
        if (freeze.getDayOfWeek() < 1 || freeze.getDayOfWeek() > 7) {
            return null;
        }
        return weekStart.plusDays(freeze.getDayOfWeek() - 1L);
    }

    @SafeVarargs
    private final List<PlanningDraftAssignment> mergeLockedAssignments(
            List<PlanningDraftAssignment>... assignmentGroups
    ) {
        Map<String, PlanningDraftAssignment> byAgentDate = new LinkedHashMap<>();
        for (List<PlanningDraftAssignment> assignmentGroup : assignmentGroups) {
            for (PlanningDraftAssignment item : assignmentGroup) {
                byAgentDate.putIfAbsent(item.agentId() + "|" + item.assignmentDate(), item);
            }
        }
        return new ArrayList<>(byAgentDate.values());
    }

    private List<PlanningDraftAssignment> mergeVisibleAssignments(
            List<PlanningDraftAssignment> current,
            List<PlanningDraftAssignment> locked
    ) {
        Map<String, PlanningDraftAssignment> byAgentDate = new LinkedHashMap<>();
        for (PlanningDraftAssignment item : current) {
            byAgentDate.put(item.agentId() + "|" + item.assignmentDate(), item);
        }
        for (PlanningDraftAssignment item : locked) {
            byAgentDate.put(item.agentId() + "|" + item.assignmentDate(), item);
        }
        return new ArrayList<>(byAgentDate.values());
    }

    private void deactivateActiveFreezes(Long agentId, int dayOfWeek, LocalDate endDate) {
        assignmentFreezeRepository.findByAgentIdAndDayOfWeekAndActiveTrue(agentId, dayOfWeek)
                .forEach(freeze -> {
                    freeze.deactivate(endDate);
                    assignmentFreezeRepository.save(freeze);
                });
    }

    private LockedOffDayKey parseLockKey(String key) {
        String[] parts = key.split("\\|", 2);
        return new LockedOffDayKey(Long.valueOf(parts[0]), LocalDate.parse(parts[1]));
    }

    private GenerationContext loadContext(LocalDate weekStart) {
        List<PlanningAgent> agents = agentRepository.findByActiveTrueOrderByFullName();
        List<Shift> shifts = shiftRepository.findByActiveTrueOrderByStartTime();
        Map<Long, Set<LocalDate>> unavailableDays = unavailabilityRepository
                .findByDateBetween(weekStart, weekStart.plusDays(6))
                .stream()
                .filter(item -> isBlockingUnavailability(item.getReason()))
                .collect(Collectors.groupingBy(
                        AgentUnavailability::getAgentId,
                        Collectors.mapping(AgentUnavailability::getDate, Collectors.toSet())
                ));
        List<PlanningDraftAssignment> history = loadHistory(weekStart);
        PlanningWeek planningWeek = planningWeekRepository.findByWeekStartDate(weekStart).orElse(null);
        List<PlanningDraftAssignment> persistedLocked = currentAssignments(weekStart).stream()
                .filter(PlanningDraftAssignment::locked)
                .toList();
        List<PlanningDraftAssignment> recurringLocked = recurringFrozenAssignments(weekStart, agents, shifts);
        List<PlanningDraftAssignment> locked = mergeLockedAssignments(persistedLocked, recurringLocked);
        Set<String> lockedKeys = locked.stream().map(PlanningDraftAssignment::key).collect(Collectors.toSet());
        List<PlanningOffDayLock> lockedOffDays = planningWeek == null
                ? List.of()
                : offDayLockRepository.findByPlanningWeekId(planningWeek.getId());
        Set<String> lockedOffDayKeys = lockedOffDays.stream()
                .map(item -> item.getAgentId() + "|" + item.getAssignmentDate())
                .collect(Collectors.toSet());
        lockedOffDayKeys.addAll(recurringFrozenOffDayKeys(weekStart));
        Map<ShiftCategory, List<Shift>> byCategory = shifts.stream()
                .collect(Collectors.groupingBy(Shift::getCategory));
        return new GenerationContext(
                weekStart,
                agents,
                shifts,
                byCategory,
                unavailableDays,
                history,
                locked,
                lockedKeys,
                lockedOffDays,
                lockedOffDayKeys,
                planningWeek
        );
    }

    private List<PlanningProblemResponse> validateGenerationSetup(GenerationContext context) {
        List<PlanningProblemResponse> problems = new ArrayList<>();
        if (context.agents().size() != REQUIRED_AGENTS) {
            problems.add(problem(
                    "INVALID_AGENT_COUNT",
                    "Exactly 12 active agents are required; found " + context.agents().size() + ".",
                    null,
                    null
            ));
        }
        for (String code : STANDARD_SHIFT_CODES) {
            if (shiftByCode(context, code).isEmpty()) {
                problems.add(problem("MISSING_SHIFT_DEFINITION",
                        "Required active shift " + code + " is missing.", null, null));
            }
        }
        if (shiftByCode(context, "SCO_11_20").isEmpty()) {
            problems.add(problem("MISSING_SHIFT_DEFINITION",
                    "Required active shift SCO_11_20 is missing.", null, null));
        }
        List<PlanningAgent> fixedScoAgents = context.agents().stream()
                .filter(PlanningAgent::isFixedSco)
                .toList();
        if (fixedScoAgents.size() > 1) {
            problems.add(problem("INVALID_FIXED_SCO_CONFIGURATION",
                    "At most one active agent may be configured as fixed SCO; found " + fixedScoAgents.size() + ".",
                    null, context.weekStart().plusDays(6)));
        }
        for (PlanningAgent agent : context.agents()) {
            int unavailable = context.unavailableDays().getOrDefault(agent.getId(), Set.of()).size();
            if (unavailable > 2) {
                problems.add(problem(
                        "TOO_MANY_UNAVAILABLE_DAYS",
                        agent.getFullName() + " has " + unavailable
                                + " unavailable days but must work exactly 5 days.",
                        agent.getId(),
                        null
                ));
            }
        }
        return problems;
    }

    private List<PlanningProblemResponse> validate(
            GenerationContext context,
            List<PlanningDraftAssignment> assignments,
            Set<String> lockedKeys
    ) {
        return validate(context, assignments, lockedKeys, ValidationMode.STRICT);
    }

    private List<PlanningProblemResponse> validate(
            GenerationContext context,
            List<PlanningDraftAssignment> assignments,
            Set<String> lockedKeys,
            ValidationMode mode
    ) {
        return validationService.validate(
                context.weekStart(),
                context.agents(),
                context.shifts(),
                assignments,
                context.history(),
                context.unavailableDays(),
                lockedKeys,
                context.lockedOffDayKeys(),
                mode
        );
    }

    private WeeklyPlanningResponse buildResponse(
            GenerationContext context,
            List<PlanningDraftAssignment> assignments,
            List<PlanningProblemResponse> problems,
            Set<String> lockedKeys
    ) {
        Map<Long, String> agentNames = context.agents().stream()
                .collect(Collectors.toMap(PlanningAgent::getId, PlanningAgent::getFullName));
        List<PlanningAssignmentResponse> assignmentResponses = assignments.stream()
                .sorted(Comparator.comparing(PlanningDraftAssignment::assignmentDate)
                        .thenComparing(PlanningDraftAssignment::startAt)
                        .thenComparing(PlanningDraftAssignment::agentName))
                .map(item -> new PlanningAssignmentResponse(
                        item.id(),
                        item.agentId(),
                        agentNames.getOrDefault(item.agentId(), item.agentName()),
                        item.shiftId(),
                        item.shiftCode(),
                        item.shiftCategory(),
                        item.assignmentDate().toString(),
                        item.startAt().toLocalTime().toString(),
                        item.endAt().toLocalTime().toString(),
                        item.paidHours(),
                        item.locked() || lockedKeys.contains(item.key()),
                        item.generated(),
                        isPersistedOverride(item.id())
                ))
                .toList();
        return new WeeklyPlanningResponse(
                context.planningWeek() == null ? null : context.planningWeek().getId(),
                context.planningWeek() == null ? PlanningStatus.DRAFT : context.planningWeek().getStatus(),
                context.weekStart(),
                context.weekStart().plusDays(6),
                context.shifts().stream().map(this::toShiftResponse).toList(),
                assignmentResponses,
                problems.stream().distinct().toList(),
                buildSummaries(context, assignments),
                context.lockedOffDayKeys().stream().sorted().toList(),
                activeFreezeResponses(context.weekStart()),
                unavailableResponses(context.weekStart()),
                context.planningWeek() != null && context.planningWeek().isManuallyOverridden()
        );
    }

    private List<PlanningFreezeResponse> activeFreezeResponses(LocalDate weekStart) {
        return activeFreezesForWeek(weekStart).stream()
                .map(freeze -> {
                    LocalDate date = dateForFreeze(weekStart, freeze);
                    if (date == null) {
                        return null;
                    }
                    return new PlanningFreezeResponse(
                            freeze.getAgentId(),
                            date.toString(),
                            freeze.getShiftId(),
                            freeze.getStartDate().toString(),
                            freeze.getEndDate() == null ? null : freeze.getEndDate().toString()
                    );
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(PlanningFreezeResponse::date)
                        .thenComparing(PlanningFreezeResponse::agentId))
                .toList();
    }

    private List<AgentUnavailabilityResponse> unavailableResponses(LocalDate weekStart) {
        return unavailabilityRepository.findByDateBetween(weekStart, weekStart.plusDays(6)).stream()
                .sorted(Comparator.comparing(AgentUnavailability::getDate)
                        .thenComparing(AgentUnavailability::getAgentId))
                .map(item -> new AgentUnavailabilityResponse(
                        item.getAgentId(),
                        item.getDate().toString(),
                        item.getReason()
                ))
                .toList();
    }

    private List<PlanningAgentSummaryResponse> buildSummaries(
            GenerationContext context,
            List<PlanningDraftAssignment> assignments
    ) {
        Map<Long, List<PlanningDraftAssignment>> byAgent = assignments.stream()
                .collect(Collectors.groupingBy(PlanningDraftAssignment::agentId));
        List<PlanningDraftAssignment> all = new ArrayList<>(context.history());
        all.addAll(assignments);
        LocalDate windowStart = context.weekStart().minusWeeks(7);
        LocalDate windowEnd = context.weekStart().plusDays(6);
        return context.agents().stream().map(agent -> {
            List<PlanningDraftAssignment> agentAssignments = byAgent.getOrDefault(agent.getId(), List.of());
            Set<LocalDate> workedDays = agentAssignments.stream()
                    .map(PlanningDraftAssignment::assignmentDate)
                    .collect(Collectors.toSet());
            List<PlanningDraftAssignment> rollingAssignments = all.stream()
                    .filter(item -> item.agentId().equals(agent.getId()))
                    .filter(item -> !item.assignmentDate().isBefore(windowStart)
                            && !item.assignmentDate().isAfter(windowEnd))
                    .toList();
            Set<LocalDate> rollingWorkedDays = rollingAssignments.stream()
                    .map(PlanningDraftAssignment::assignmentDate)
                    .collect(Collectors.toSet());
            long saturdayOff = countWeekendDayOff(windowStart, windowEnd, rollingWorkedDays, DayOfWeek.SATURDAY);
            long sundayOff = countWeekendDayOff(windowStart, windowEnd, rollingWorkedDays, DayOfWeek.SUNDAY);
            long completeWeekendOff = countCompleteWeekendOff(windowStart, windowEnd, rollingWorkedDays);
            LocalDate lastCompleteWeekendOff = lastCompleteWeekendOff(windowStart, windowEnd, rollingWorkedDays);
            long weekendsWorked = countWeekendsWorked(windowStart, windowEnd, rollingWorkedDays);
            return new PlanningAgentSummaryResponse(
                    agent.getId(),
                    agent.getFullName(),
                    agentAssignments.stream().mapToInt(PlanningDraftAssignment::paidHours).sum(),
                    rollingAssignments.stream().filter(item -> item.shiftCategory() == ShiftCategory.OPENING).count(),
                    rollingAssignments.stream().filter(item -> item.shiftCategory() == ShiftCategory.CLOSING).count(),
                    weekDays(context.weekStart()).stream().filter(day -> !workedDays.contains(day)).count(),
                    rollingAssignments.stream().filter(item -> "CLOSE_13_22".equals(item.shiftCode())).count(),
                    saturdayOff,
                    sundayOff,
                    completeWeekendOff,
                    lastCompleteWeekendOff,
                    weekendsWorked,
                    rollingAssignments.stream().filter(item -> item.shiftCategory() == ShiftCategory.SCO).count()
            );
        }).toList();
    }

    private long countWeekendDayOff(
            LocalDate start,
            LocalDate end,
            Set<LocalDate> workedDays,
            DayOfWeek dayOfWeek
    ) {
        long count = 0;
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            if (date.getDayOfWeek() == dayOfWeek && !workedDays.contains(date)) {
                count++;
            }
        }
        return count;
    }

    private long countCompleteWeekendOff(LocalDate start, LocalDate end, Set<LocalDate> workedDays) {
        long count = 0;
        for (LocalDate date = start; !date.isAfter(end.minusDays(1)); date = date.plusDays(1)) {
            if (date.getDayOfWeek() == DayOfWeek.SATURDAY
                    && !workedDays.contains(date)
                    && !workedDays.contains(date.plusDays(1))) {
                count++;
            }
        }
        return count;
    }

    private LocalDate lastCompleteWeekendOff(LocalDate start, LocalDate end, Set<LocalDate> workedDays) {
        LocalDate last = null;
        for (LocalDate date = start; !date.isAfter(end.minusDays(1)); date = date.plusDays(1)) {
            if (date.getDayOfWeek() == DayOfWeek.SATURDAY
                    && !workedDays.contains(date)
                    && !workedDays.contains(date.plusDays(1))) {
                last = date;
            }
        }
        return last;
    }

    private long countWeekendsWorked(LocalDate start, LocalDate end, Set<LocalDate> workedDays) {
        long count = 0;
        for (LocalDate date = start; !date.isAfter(end.minusDays(1)); date = date.plusDays(1)) {
            if (date.getDayOfWeek() == DayOfWeek.SATURDAY
                    && (workedDays.contains(date) || workedDays.contains(date.plusDays(1)))) {
                count++;
            }
        }
        return count;
    }

    private List<PlanningDraftAssignment> currentAssignments(LocalDate weekStart) {
        return planningWeekRepository.findByWeekStartDate(weekStart)
                .map(PlanningWeek::getId)
                .map(assignmentRepository::findByPlanningWeekId)
                .orElse(List.of())
                .stream()
                .map(this::toDraft)
                .toList();
    }

    private List<PlanningDraftAssignment> loadHistory(LocalDate weekStart) {
        LocalDate historyStart = weekStart.minusWeeks(8);
        return assignmentRepository.findByAssignmentDateBetween(historyStart, weekStart.minusDays(1)).stream()
                .map(this::toDraft)
                .toList();
    }

    private PlanningDraftAssignment toDraft(PlanningAssignment assignment) {
        return new PlanningDraftAssignment(
                assignment.getId(),
                assignment.getAgentId(),
                "Agent " + assignment.getAgentId(),
                assignment.getShiftId(),
                assignment.getShiftCode(),
                assignment.getShiftCategory(),
                assignment.getAssignmentDate(),
                assignment.getAssignmentDate().atTime(assignment.getStartTime()),
                assignment.getAssignmentDate().atTime(assignment.getEndTime()),
                assignment.getPaidHours(),
                assignment.isLocked(),
                assignment.isGenerated()
        );
    }

    private ShiftResponse toShiftResponse(Shift shift) {
        return new ShiftResponse(
                shift.getId(),
                shift.getCode(),
                shift.getName(),
                shift.getCategory(),
                shift.getStartTime().toString(),
                shift.getEndTime().toString(),
                shift.getPaidHours()
        );
    }

    private PlanningProblemResponse problem(String code, String message, Long agentId, LocalDate date) {
        return new PlanningProblemResponse(
                ProblemSeverity.ERROR,
                code,
                message,
                agentId,
                date == null ? null : date.toString()
        );
    }

    private void rejectErrors(String message, List<PlanningProblemResponse> problems) {
        List<PlanningProblemResponse> errors = problems.stream()
                .filter(problem -> problem.severity() == ProblemSeverity.ERROR)
                .toList();
        if (!errors.isEmpty()) {
            throw new PlanningValidationException(message, errors);
        }
    }

    private boolean hasErrors(List<PlanningProblemResponse> problems) {
        return problems.stream().anyMatch(problem -> problem.severity() == ProblemSeverity.ERROR);
    }

    private long errorCount(List<PlanningProblemResponse> problems) {
        return problems.stream().filter(problem -> problem.severity() == ProblemSeverity.ERROR).count();
    }

    private boolean hasBlockingGenerationErrors(List<PlanningProblemResponse> problems) {
        return problems.stream().anyMatch(problem ->
                problem.severity() == ProblemSeverity.ERROR
                        && !GENERATION_WARNING_ERROR_CODES.contains(problem.code()));
    }

    private long blockingGenerationErrorCount(List<PlanningProblemResponse> problems) {
        return problems.stream()
                .filter(problem -> problem.severity() == ProblemSeverity.ERROR)
                .filter(problem -> !GENERATION_WARNING_ERROR_CODES.contains(problem.code()))
                .count();
    }

    private List<PlanningProblemResponse> downgradeGenerationWarnings(List<PlanningProblemResponse> problems) {
        return problems.stream()
                .map(problem -> problem.severity() == ProblemSeverity.ERROR
                        && GENERATION_WARNING_ERROR_CODES.contains(problem.code())
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

    private boolean isPersistedOverride(Long assignmentId) {
        return assignmentId != null
                && assignmentRepository.findById(assignmentId)
                .map(PlanningAssignment::isManuallyOverridden)
                .orElse(false);
    }

    private boolean isOverrideableRule(String code) {
        return !Set.of(
                "ASSIGNMENT_OUTSIDE_WEEK",
                "UNKNOWN_OR_INACTIVE_AGENT",
                "DUPLICATE_AGENT_DAY",
                "INVALID_SHIFT",
                "LOCKED_ASSIGNMENT_OVERWRITTEN",
                "LOCKED_OFF_DAY_OVERWRITTEN"
        ).contains(code);
    }

    private String optionalOverrideReason(String reason) {
        return reason == null || reason.isBlank() ? "Non renseignée" : reason.trim();
    }

    private void writeOverrideAudit(
            Long planningWeekId,
            String supervisorIdentity,
            List<PlanningDraftAssignment> previous,
            List<PlanningDraftAssignment> current,
            List<PlanningProblemResponse> warnings,
            String reason
    ) {
        Map<String, PlanningDraftAssignment> before = previous.stream()
                .collect(Collectors.toMap(
                        item -> item.agentId() + "|" + item.assignmentDate(),
                        Function.identity(),
                        (left, right) -> left
                ));
        Map<String, PlanningDraftAssignment> after = current.stream()
                .collect(Collectors.toMap(
                        item -> item.agentId() + "|" + item.assignmentDate(),
                        Function.identity(),
                        (left, right) -> left
                ));
        Set<String> cells = new HashSet<>(before.keySet());
        cells.addAll(after.keySet());
        String violatedRules = warnings.stream().map(PlanningProblemResponse::code)
                .distinct().sorted().collect(Collectors.joining(","));
        for (String cell : cells) {
            PlanningDraftAssignment oldValue = before.get(cell);
            PlanningDraftAssignment newValue = after.get(cell);
            String oldCode = oldValue == null ? "OFF" : oldValue.shiftCode();
            String newCode = newValue == null ? "OFF" : newValue.shiftCode();
            if (oldCode.equals(newCode)) {
                continue;
            }
            PlanningDraftAssignment reference = newValue == null ? oldValue : newValue;
            overrideAuditRepository.save(new PlanningOverrideAudit(
                    planningWeekId,
                    supervisorIdentity,
                    reference.agentId(),
                    reference.assignmentDate(),
                    oldValue == null ? null : oldValue.shiftId(),
                    newValue == null ? null : newValue.shiftId(),
                    oldCode,
                    newCode,
                    violatedRules,
                    reason
            ));
        }
    }

    private LocalDate normalizeWeekStart(LocalDate date) {
        return date.minusDays(date.getDayOfWeek().getValue() - 1L);
    }

    private List<LocalDate> weekDays(LocalDate weekStart) {
        List<LocalDate> days = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            days.add(weekStart.plusDays(i));
        }
        return days;
    }

    private record GenerationContext(
            LocalDate weekStart,
            List<PlanningAgent> agents,
            List<Shift> shifts,
            Map<ShiftCategory, List<Shift>> shiftsByCategory,
            Map<Long, Set<LocalDate>> unavailableDays,
            List<PlanningDraftAssignment> history,
            List<PlanningDraftAssignment> lockedAssignments,
            Set<String> lockedKeys,
            List<PlanningOffDayLock> lockedOffDays,
            Set<String> lockedOffDayKeys,
            PlanningWeek planningWeek
    ) {
    }

    private record GenerationResult(
            List<PlanningDraftAssignment> assignments,
            List<PlanningProblemResponse> problems,
            Set<String> lockedKeys
    ) {
    }

    private record LockedOffDayKey(Long agentId, LocalDate date) {
    }
}
