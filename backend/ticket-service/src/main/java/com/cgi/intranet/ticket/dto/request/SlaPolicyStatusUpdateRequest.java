package com.cgi.intranet.ticket.dto.request;

import jakarta.validation.constraints.NotNull;

public record SlaPolicyStatusUpdateRequest(
        @NotNull(message = "Le statut d'activation est obligatoire")
        Boolean active
) {
}
