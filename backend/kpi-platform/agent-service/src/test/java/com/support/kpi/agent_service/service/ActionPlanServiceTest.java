package com.support.kpi.agent_service.service;

import com.support.kpi.agent_service.dto.ActionPlanRequest;
import com.support.kpi.agent_service.dto.ActionPlanResponse;
import com.support.kpi.agent_service.entity.ActionPlan;
import com.support.kpi.agent_service.entity.Agent;
import com.support.kpi.agent_service.repository.ActionPlanRepository;
import com.support.kpi.agent_service.repository.AgentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ActionPlanServiceTest {

    @Mock
    private ActionPlanRepository actionPlanRepository;

    @Mock
    private AgentRepository agentRepository;

    @InjectMocks
    private ActionPlanService actionPlanService;

    private ActionPlanRequest request;
    private Agent agent;
    private ActionPlan savedActionPlan;

    @BeforeEach
    void setUp() {
        request = new ActionPlanRequest();
        request.setAgentMatricule("M12345");
        request.setDescription("Améliorer le temps de réponse au téléphone.");

        agent = new Agent();
        agent.setId(UUID.randomUUID());
        agent.setMatricule("M12345");
        agent.setNom("FAID");
        agent.setPrenom("Anas");

        savedActionPlan = new ActionPlan();
        savedActionPlan.setId(UUID.randomUUID());
        savedActionPlan.setDescription("Améliorer le temps de réponse au téléphone.");
        savedActionPlan.setStatus("A_FAIRE");
        savedActionPlan.setAgent(agent);
    }

    @Test
    void shouldCreateActionPlan_whenAgentExists() {
        when(agentRepository.findByMatricule("M12345")).thenReturn(Optional.of(agent));
        when(actionPlanRepository.save(any(ActionPlan.class))).thenReturn(savedActionPlan);

        ActionPlanResponse response = actionPlanService.createActionPlan(request);

        assertNotNull(response);
        assertEquals("Améliorer le temps de réponse au téléphone.", response.getDescription());
        assertEquals("A_FAIRE", response.getStatus());
        assertEquals("M12345", response.getAgentMatricule());
        
        verify(actionPlanRepository, times(1)).save(any(ActionPlan.class));
    }

    @Test
    void shouldThrowException_whenAgentDoesNotExist() {
        when(agentRepository.findByMatricule("M12345")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> actionPlanService.createActionPlan(request));
        verify(actionPlanRepository, never()).save(any(ActionPlan.class));
    }
}
