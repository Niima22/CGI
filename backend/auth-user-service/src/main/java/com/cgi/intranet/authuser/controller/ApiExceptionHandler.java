package com.cgi.intranet.authuser.controller;

import com.cgi.intranet.authuser.dto.response.ApiErrorResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private final ObjectMapper objectMapper;

    public ApiExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : exception.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }

        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                "VALIDATION_ERROR",
                fieldErrors.values().stream().findFirst().orElse("Les informations saisies sont invalides."),
                fieldErrors,
                Instant.now()
        ));
    }

    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<ApiErrorResponse> handleIdentityProviderError(
            RestClientResponseException exception
    ) {
        String providerMessage = extractProviderMessage(exception.getResponseBodyAsString());
        HttpStatus status = exception.getStatusCode().is4xxClientError()
                ? HttpStatus.BAD_REQUEST
                : HttpStatus.BAD_GATEWAY;

        return ResponseEntity.status(status).body(new ApiErrorResponse(
                "IDENTITY_PROVIDER_ERROR",
                providerMessage,
                Map.of(),
                Instant.now()
        ));
    }

    private String extractProviderMessage(String responseBody) {
        try {
            JsonNode body = objectMapper.readTree(responseBody);
            String description = body.path("error_description").asText("");
            if (description.contains("minimum length 12")) {
                return "Le mot de passe doit contenir au moins 12 caracteres.";
            }
            if (!description.isBlank()) {
                return description;
            }
        } catch (Exception ignored) {
            // Keep external implementation details out of the API response.
        }
        return "Le service d'identite a refuse la creation de l'utilisateur.";
    }
}
