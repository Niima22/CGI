package com.support.kpi.agent_service.service;

import com.support.kpi.agent_service.dto.ActionPlanRequest;
import com.support.kpi.agent_service.dto.ActionPlanResponse;
import com.support.kpi.agent_service.entity.ActionPlan;
import com.support.kpi.agent_service.entity.Agent;
import com.support.kpi.agent_service.repository.ActionPlanRepository;
import com.support.kpi.agent_service.repository.AgentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActionPlanService {

    private final ActionPlanRepository actionPlanRepository;
    private final AgentRepository agentRepository;

    public ActionPlanResponse createActionPlan(ActionPlanRequest request) {
        // Vérification de l'existence de l'agent
        Agent agent = agentRepository.findByMatricule(request.getAgentMatricule())
                .orElseThrow(() -> new IllegalArgumentException("Agent introuvable avec le matricule: " + request.getAgentMatricule()));

        ActionPlan actionPlan = new ActionPlan();
        actionPlan.setDescription(request.getDescription());
        actionPlan.setAgent(agent);
        // Le statut "A_FAIRE" et la date de création sont gérés automatiquement par @PrePersist

        ActionPlan savedActionPlan = actionPlanRepository.save(actionPlan);

        return mapToResponse(savedActionPlan);
    }

    public java.util.List<ActionPlanResponse> getAllActionPlans() {
        return actionPlanRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public java.util.List<ActionPlanResponse> getActionPlansByAgent(String matricule) {
        Agent agent = agentRepository.findByMatricule(matricule)
                .orElseThrow(() -> new IllegalArgumentException("Agent introuvable"));
        
        return actionPlanRepository.findByAgent(agent).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private ActionPlanResponse mapToResponse(ActionPlan actionPlan) {
        return ActionPlanResponse.builder()
                .id(actionPlan.getId())
                .description(actionPlan.getDescription())
                .status(actionPlan.getStatus())
                .createdAt(actionPlan.getCreatedAt())
                .agentMatricule(actionPlan.getAgent().getMatricule())
                .build();
    }
}
