package com.support.kpi.agent_service.service;

import com.support.kpi.agent_service.dto.AgentRequest;
import com.support.kpi.agent_service.dto.AgentResponse;
import com.support.kpi.agent_service.entity.Agent;
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
public class AgentServiceTest {

    @Mock
    private AgentRepository agentRepository;

    @InjectMocks
    private AgentService agentService;

    private AgentRequest agentRequest;
    private Agent savedAgent;
    private UUID agentId;

    @BeforeEach
    void setUp() {
        agentId = UUID.randomUUID();
        
        agentRequest = new AgentRequest();
        agentRequest.setMatricule("M12345");
        agentRequest.setNom("FAID");
        agentRequest.setPrenom("Anas");
        
        savedAgent = new Agent();
        savedAgent.setId(agentId);
        savedAgent.setMatricule("M12345");
        savedAgent.setNom("FAID");
        savedAgent.setPrenom("Anas");
    }

    @Test
    void shouldCreateAgent_whenValidRequest() {
        // Arrange : On simule la sauvegarde dans la base de données
        when(agentRepository.save(any(Agent.class))).thenReturn(savedAgent);
        when(agentRepository.existsByMatricule("M12345")).thenReturn(false);

        // Act : On appelle le service qu'on est en train de concevoir
        AgentResponse response = agentService.createAgent(agentRequest);

        // Assert : On vérifie que le service a fait son travail
        assertNotNull(response);
        assertEquals(agentId, response.getId());
        assertEquals("FAID", response.getNom());
        verify(agentRepository, times(1)).save(any(Agent.class));
    }

    @Test
    void shouldThrowException_whenMatriculeAlreadyExists() {
        // Arrange : On simule qu'un agent avec ce matricule existe déjà
        when(agentRepository.existsByMatricule("M12345")).thenReturn(true);

        // Act & Assert : On vérifie que la création lève une erreur
        assertThrows(IllegalArgumentException.class, () -> agentService.createAgent(agentRequest));
        verify(agentRepository, never()).save(any(Agent.class));
    }
}
