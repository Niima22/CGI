package com.support.kpi.agent_service.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ActionPlanResponse {
    private UUID id;
    private String description;
    private String status;
    private LocalDateTime createdAt;
    private String agentMatricule;
}
