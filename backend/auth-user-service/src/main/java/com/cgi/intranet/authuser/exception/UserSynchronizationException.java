package com.cgi.intranet.authuser.exception;

public class UserSynchronizationException extends RuntimeException {

    public UserSynchronizationException(String message) {
        super(message);
    }

    public UserSynchronizationException(String message, Throwable cause) {
        super(message, cause);
    }
}
