package com.cgi.intranet.messaging.controller;

import com.cgi.intranet.messaging.dto.request.CreateConversationRequest;
import com.cgi.intranet.messaging.dto.request.ParticipantRequest;
import com.cgi.intranet.messaging.dto.response.ConversationResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;
import com.cgi.intranet.messaging.enums.ConversationType;
import com.cgi.intranet.messaging.security.SecurityConfig;
import com.cgi.intranet.messaging.service.ConversationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ConversationController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class ConversationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ConversationService conversationService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void listConversationsReturnsCurrentUserConversations() throws Exception {
        when(conversationService.listCurrentUserConversations()).thenReturn(List.of(conversationResponse(41L, ConversationType.DIRECT)));

        mockMvc.perform(get("/api/messages/conversations")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(41L))
                .andExpect(jsonPath("$[0].type").value("DIRECT"))
                .andExpect(jsonPath("$[0].participants.length()").value(2));
    }

    @Test
    void createConversationReturnsCreatedResponse() throws Exception {
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.GROUP,
                "Equipe support",
                List.of(3L, 5L),
                null,
                "Bonjour",
                false
        );
        when(conversationService.createConversation(any(CreateConversationRequest.class)))
                .thenReturn(conversationResponse(42L, ConversationType.GROUP));

        mockMvc.perform(post("/api/messages/conversations")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_MANAGER")))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42L))
                .andExpect(jsonPath("$.type").value("GROUP"));

        verify(conversationService).createConversation(any(CreateConversationRequest.class));
    }

    @Test
    void getConversationReturnsConversationDetail() throws Exception {
        when(conversationService.getConversation(44L)).thenReturn(conversationResponse(44L, ConversationType.TICKET));

        mockMvc.perform(get("/api/messages/conversations/44")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(44L))
                .andExpect(jsonPath("$.type").value("TICKET"));
    }

    @Test
    void addParticipantReturnsCreatedParticipant() throws Exception {
        when(conversationService.addParticipant(44L, new ParticipantRequest(7L)))
                .thenReturn(new ParticipantResponse(7L, LocalDateTime.now().minusMinutes(1), true, null));

        mockMvc.perform(post("/api/messages/conversations/44/participants")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_MANAGER")))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new ParticipantRequest(7L))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(7L))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void removeParticipantReturnsUpdatedParticipant() throws Exception {
        when(conversationService.removeParticipant(44L, 7L))
                .thenReturn(new ParticipantResponse(7L, LocalDateTime.now().minusDays(1), false, null));

        mockMvc.perform(delete("/api/messages/conversations/44/participants/7")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_MANAGER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(7L))
                .andExpect(jsonPath("$.active").value(false));
    }

    private ConversationResponse conversationResponse(Long id, ConversationType type) {
        LocalDateTime now = LocalDateTime.now();
        return new ConversationResponse(
                id,
                type,
                type == ConversationType.GROUP ? "Equipe support" : null,
                type == ConversationType.TICKET ? 1001L : null,
                1L,
                now.minusHours(2),
                now.minusMinutes(15),
                List.of(
                        new ParticipantResponse(1L, now.minusHours(2), true, now.minusMinutes(10)),
                        new ParticipantResponse(3L, now.minusHours(2), true, null)
                ),
                "Bonjour",
                now.minusMinutes(15),
                false,
                1L
        );
    }
}
