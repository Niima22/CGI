package com.cgi.intranet.messaging.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank(message = "Le contenu du message ne peut pas etre vide")
        @Size(max = 4000, message = "Le contenu du message ne doit pas depasser 4000 caracteres")
        String content,
        Boolean urgent
) {
}
