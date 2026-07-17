package com.support.kpi.agent_service.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.support.kpi.agent_service.dto.AgentRequest;
import com.support.kpi.agent_service.dto.AgentResponse;
import com.support.kpi.agent_service.service.AgentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AgentController.class)
public class AgentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AgentService agentService;

    private AgentRequest agentRequest;
    private AgentResponse agentResponse;

    @BeforeEach
    void setUp() {
        agentRequest = new AgentRequest();
        agentRequest.setMatricule("M12345");
        agentRequest.setNom("FAID");
        agentRequest.setPrenom("Anas");

        agentResponse = AgentResponse.builder()
                .id(UUID.randomUUID())
                .matricule("M12345")
                .nom("FAID")
                .prenom("Anas")
                .build();
    }

    @Test
    void shouldCreateAgentAndReturn201() throws Exception {
        // Arrange : simuler le comportement du service
        when(agentService.createAgent(any(AgentRequest.class))).thenReturn(agentResponse);

        // Act & Assert : simuler une requête POST et vérifier la réponse JSON
        mockMvc.perform(post("/api/agents")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(agentRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.matricule").value("M12345"))
                .andExpect(jsonPath("$.nom").value("FAID"))
                .andExpect(jsonPath("$.prenom").value("Anas"));
    }
}
