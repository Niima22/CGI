package com.cgi.intranet.authuser.controller;

import com.cgi.intranet.authuser.exception.InactiveUserException;
import com.cgi.intranet.authuser.exception.KeycloakSyncException;
import com.cgi.intranet.authuser.exception.UserNotFoundException;
import com.cgi.intranet.authuser.exception.UserSynchronizationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(InactiveUserException.class)
    public ResponseEntity<Map<String, String>> handleInactiveUserException(InactiveUserException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "code", "ACCOUNT_INACTIVE",
                        "message", exception.getMessage()
                ));
    }

    @ExceptionHandler(KeycloakSyncException.class)
    public ResponseEntity<Map<String, String>> handleKeycloakSyncException(KeycloakSyncException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(UserSynchronizationException.class)
    public ResponseEntity<Map<String, String>> handleUserSynchronizationException(
            UserSynchronizationException exception
    ) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleUserNotFoundException(UserNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", exception.getMessage()));
    }
}
