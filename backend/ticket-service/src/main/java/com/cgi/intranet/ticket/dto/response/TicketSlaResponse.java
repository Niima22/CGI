package com.cgi.intranet.ticket.dto.response;

import com.cgi.intranet.ticket.enums.SlaStatus;

import java.time.LocalDateTime;

public record TicketSlaResponse(
        Long ticketId,
        Long policyId,
        String policyName,
        LocalDateTime responseDeadline,
        LocalDateTime resolutionDeadline,
        LocalDateTime firstResponseAt,
        LocalDateTime resolvedAt,
        SlaStatus responseStatus,
        String responseStatusLabel,
        SlaStatus resolutionStatus,
        String resolutionStatusLabel,
        SlaStatus globalStatus,
        String globalStatusLabel,
        Long elapsedMinutes,
        Long remainingMinutes,
        Double consumedPercentage,
        String breachReason,
        LocalDateTime lastCalculatedAt
) {
}
