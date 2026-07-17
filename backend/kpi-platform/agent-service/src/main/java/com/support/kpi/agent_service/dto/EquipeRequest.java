package com.support.kpi.agent_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EquipeRequest {
    @NotBlank(message = "Le nom de l'équipe est obligatoire")
    private String nom;
}
