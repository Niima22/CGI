package com.cgi.intranet.ticket.dto.request;

import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SlaPolicyCreateRequest(
        @NotBlank(message = "Le nom de la politique SLA est obligatoire")
        @Size(max = 160, message = "Le nom de la politique SLA ne doit pas dépasser 160 caractères")
        String name,
        @NotNull(message = "Le type d'incident est obligatoire")
        TicketType incidentType,
        @NotNull(message = "La priorité est obligatoire")
        TicketPriority priority,
        @NotNull(message = "La criticité est obligatoire")
        TicketCriticality criticality,
        @NotNull(message = "Le délai de prise en charge est obligatoire")
        @Min(value = 1, message = "Le délai de prise en charge doit être supérieur à 0 minute")
        Integer responseTimeMinutes,
        @NotNull(message = "Le délai de résolution est obligatoire")
        @Min(value = 1, message = "Le délai de résolution doit être supérieur à 0 minute")
        Integer resolutionTimeMinutes,
        @NotNull(message = "Le seuil d'alerte est obligatoire")
        @Min(value = 1, message = "Le seuil d'alerte doit être compris entre 1 et 100")
        @Max(value = 100, message = "Le seuil d'alerte doit être compris entre 1 et 100")
        Integer warningThresholdPercent
) {
}
