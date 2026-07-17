package com.support.kpi.agent_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ActionPlanRequest {
    @NotBlank(message = "La description est obligatoire")
    private String description;

    @NotBlank(message = "Le matricule de l'agent est obligatoire")
    private String agentMatricule;
}
