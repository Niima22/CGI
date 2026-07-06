package com.cgi.intranet.messaging.exception;

public class ConversationAccessDeniedException extends RuntimeException {

    public ConversationAccessDeniedException() {
        super("Acces refuse a cette conversation");
    }
}
