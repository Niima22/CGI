package com.cgi.intranet.messaging.controller;

import com.cgi.intranet.messaging.dto.request.SendMessageRequest;
import com.cgi.intranet.messaging.dto.response.MessageResponse;
import com.cgi.intranet.messaging.dto.response.PagedResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;
import com.cgi.intranet.messaging.dto.response.UnreadCountResponse;
import com.cgi.intranet.messaging.exception.ConversationAccessDeniedException;
import com.cgi.intranet.messaging.security.SecurityConfig;
import com.cgi.intranet.messaging.service.MessageService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MessageController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class MessageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MessageService messageService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void getConversationMessagesReturnsHistory() throws Exception {
        when(messageService.listConversationMessages(eq(12L), any()))
                .thenReturn(new PagedResponse<>(List.of(
                        messageResponse(1L, 12L, 3L, "Bonjour", false, true),
                        messageResponse(2L, 12L, 5L, "Urgent", true, false)
                ), 0, 100, 2, 1, true, true));

        mockMvc.perform(get("/api/messages/conversations/12/messages")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].content").value("Bonjour"))
                .andExpect(jsonPath("$.content[1].urgent").value(true))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[1].ownMessage").value(false));
    }

    @Test
    void sendMessageReturnsSavedMessage() throws Exception {
        SendMessageRequest request = new SendMessageRequest("Message normal", false);
        when(messageService.sendMessage(eq(12L), any(SendMessageRequest.class)))
                .thenReturn(messageResponse(7L, 12L, 3L, "Message normal", false, true));

        mockMvc.perform(post("/api/messages/conversations/12/messages")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE")))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7L))
                .andExpect(jsonPath("$.content").value("Message normal"))
                .andExpect(jsonPath("$.ownMessage").value(true));

        verify(messageService).sendMessage(eq(12L), any(SendMessageRequest.class));
    }

    @Test
    void sendMessageRejectsBlankContent() throws Exception {
        mockMvc.perform(post("/api/messages/conversations/12/messages")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE")))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new SendMessageRequest("   ", false))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La validation de la requete a echoue"))
                .andExpect(jsonPath("$.errors.content").value("Le contenu du message ne peut pas etre vide"));
    }

    @Test
    void markConversationReadReturnsParticipantState() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        when(messageService.markConversationRead(12L))
                .thenReturn(new ParticipantResponse(3L, now.minusDays(1), true, now));

        mockMvc.perform(patch("/api/messages/conversations/12/read")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(3L))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.lastReadAt").exists());
    }

    @Test
    void unreadCountReturnsCurrentUserTotal() throws Exception {
        when(messageService.getCurrentUserUnreadTotal()).thenReturn(new UnreadCountResponse(5L));

        mockMvc.perform(get("/api/messages/unread-count")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(5L));
    }

    @Test
    void nonMemberAccessIsRejected() throws Exception {
        when(messageService.listConversationMessages(eq(99L), any())).thenThrow(new ConversationAccessDeniedException());

        mockMvc.perform(get("/api/messages/conversations/99/messages")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Acces refuse a cette conversation"));
    }

    private MessageResponse messageResponse(
            Long id,
            Long conversationId,
            Long senderUserId,
            String content,
            boolean urgent,
            boolean ownMessage
    ) {
        LocalDateTime now = LocalDateTime.now();
        return new MessageResponse(
                id,
                conversationId,
                senderUserId,
                content,
                urgent,
                now.minusMinutes(5),
                null,
                null,
                ownMessage
        );
    }
}
