package com.cgi.intranet.messaging.dto.request;

import jakarta.validation.constraints.NotNull;

public record ParticipantRequest(
        @NotNull(message = "L'identifiant du participant est obligatoire")
        Long userId
) {
}
