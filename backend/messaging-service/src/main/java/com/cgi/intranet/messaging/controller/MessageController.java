package com.cgi.intranet.messaging.controller;

import com.cgi.intranet.messaging.dto.request.SendMessageRequest;
import com.cgi.intranet.messaging.dto.response.MessageResponse;
import com.cgi.intranet.messaging.dto.response.PagedResponse;
import com.cgi.intranet.messaging.dto.response.ParticipantResponse;
import com.cgi.intranet.messaging.dto.response.UnreadCountResponse;
import com.cgi.intranet.messaging.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<PagedResponse<MessageResponse>> getConversationMessages(
            @PathVariable Long conversationId,
            @PageableDefault(size = 100) Pageable pageable
    ) {
        return ResponseEntity.ok(messageService.listConversationMessages(conversationId, pageable));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ResponseEntity.ok(messageService.sendMessage(conversationId, request));
    }

    @PatchMapping("/conversations/{conversationId}/read")
    public ResponseEntity<ParticipantResponse> markConversationRead(@PathVariable Long conversationId) {
        return ResponseEntity.ok(messageService.markConversationRead(conversationId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount() {
        return ResponseEntity.ok(messageService.getCurrentUserUnreadTotal());
    }
}
