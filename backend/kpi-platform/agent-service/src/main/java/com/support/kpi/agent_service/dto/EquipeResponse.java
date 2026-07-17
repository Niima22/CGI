package com.support.kpi.agent_service.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class EquipeResponse {
    private UUID id;
    private String nom;
}
