package com.cgi.intranet.planning.exception;

import com.cgi.intranet.planning.dto.response.PlanningErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class PlanningExceptionHandler {

    @ExceptionHandler(PlanningValidationException.class)
    ResponseEntity<PlanningErrorResponse> handleValidation(PlanningValidationException exception) {
        return ResponseEntity.unprocessableEntity()
                .body(new PlanningErrorResponse(exception.getMessage(), exception.getProblems()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<PlanningErrorResponse> handleNotFound(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new PlanningErrorResponse(exception.getMessage(), java.util.List.of()));
    }
}
