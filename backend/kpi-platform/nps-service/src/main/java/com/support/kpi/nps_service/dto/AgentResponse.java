package com.support.kpi.nps_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentResponse {
    private UUID id;
    private String matricule;
    private String nom;
    private String prenom;
    private String codeGdi;
    private String loginGrafana;
    private String logCare;
    private String nomNormalise;
}
