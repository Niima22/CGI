package com.support.kpi.agent_service.controller;

import com.support.kpi.agent_service.dto.ActionPlanRequest;
import com.support.kpi.agent_service.dto.ActionPlanResponse;
import com.support.kpi.agent_service.service.ActionPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/action-plans")
@RequiredArgsConstructor
public class ActionPlanController {

    private final ActionPlanService actionPlanService;

    @PostMapping
    public ResponseEntity<ActionPlanResponse> createActionPlan(@Valid @RequestBody ActionPlanRequest request) {
        ActionPlanResponse response = actionPlanService.createActionPlan(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ActionPlanResponse>> getAllActionPlans() {
        return ResponseEntity.ok(actionPlanService.getAllActionPlans());
    }

    @GetMapping("/agent/{matricule}")
    public ResponseEntity<List<ActionPlanResponse>> getActionPlansByAgent(@PathVariable String matricule) {
        return ResponseEntity.ok(actionPlanService.getActionPlansByAgent(matricule));
    }
}
