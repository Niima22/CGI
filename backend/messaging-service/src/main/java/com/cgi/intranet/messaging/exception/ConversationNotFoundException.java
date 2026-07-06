package com.cgi.intranet.messaging.exception;

public class ConversationNotFoundException extends RuntimeException {

    public ConversationNotFoundException(Long conversationId) {
        super("Conversation introuvable: " + conversationId);
    }
}
