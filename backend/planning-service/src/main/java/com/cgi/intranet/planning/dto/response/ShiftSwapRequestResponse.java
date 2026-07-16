package com.cgi.intranet.planning.dto.response;

public record ShiftSwapRequestResponse(
        Long id,
        Long requesterAgentId,
        String requesterAgentName,
        Long targetAgentId,
        String targetAgentName,
        String requesterDate,
        String targetDate,
        String status,
        String reason,
        String createdAt
) {
}
