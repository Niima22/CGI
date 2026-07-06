package com.cgi.intranet.messaging.controller;

import com.cgi.intranet.messaging.dto.request.CreateConversationRequest;
import com.cgi.intranet.messaging.dto.request.ParticipantRequest;
import com.cgi.intranet.messaging.dto.response.ConversationResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;
import com.cgi.intranet.messaging.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getCurrentUserConversations() {
        return ResponseEntity.ok(conversationService.listCurrentUserConversations());
    }

    @PostMapping("/conversations")
    public ResponseEntity<ConversationResponse> createConversation(
            @Valid @RequestBody CreateConversationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conversationService.createConversation(request));
    }

    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<ConversationResponse> getConversation(@PathVariable Long conversationId) {
        return ResponseEntity.ok(conversationService.getConversation(conversationId));
    }

    @PostMapping("/conversations/{conversationId}/participants")
    public ResponseEntity<ParticipantResponse> addParticipant(
            @PathVariable Long conversationId,
            @Valid @RequestBody ParticipantRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conversationService.addParticipant(conversationId, request));
    }

    @DeleteMapping("/conversations/{conversationId}/participants/{userId}")
    public ResponseEntity<ParticipantResponse> removeParticipant(
            @PathVariable Long conversationId,
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(conversationService.removeParticipant(conversationId, userId));
    }

    @GetMapping("/tickets/{ticketId}/conversation")
    public ResponseEntity<ConversationResponse> getTicketConversation(@PathVariable Long ticketId) {
        return ResponseEntity.ok(conversationService.getTicketConversation(ticketId));
    }

    @PostMapping("/tickets/{ticketId}/conversation")
    public ResponseEntity<ConversationResponse> createTicketConversation(
            @PathVariable Long ticketId,
            @Valid @RequestBody CreateConversationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conversationService.createTicketConversation(ticketId, request));
    }
}
