package com.cgi.intranet.authuser.exception;

public class KeycloakSyncException extends RuntimeException {

    public KeycloakSyncException(String message) {
        super(message);
    }

    public KeycloakSyncException(String message, Throwable cause) {
        super(message, cause);
    }
}
