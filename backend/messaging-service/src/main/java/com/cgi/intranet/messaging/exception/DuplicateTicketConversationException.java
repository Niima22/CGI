package com.cgi.intranet.messaging.exception;

public class DuplicateTicketConversationException extends RuntimeException {

    public DuplicateTicketConversationException(Long ticketId) {
        super("Une conversation existe deja pour le ticket " + ticketId);
    }
}
