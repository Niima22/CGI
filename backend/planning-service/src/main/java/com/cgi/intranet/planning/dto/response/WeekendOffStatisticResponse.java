package com.cgi.intranet.planning.dto.response;

import java.time.LocalDate;
import java.util.List;

public record WeekendOffStatisticResponse(
        Long agentId,
        String fullName,
        LocalDate periodStart,
        LocalDate periodEnd,
        long saturdayOffCount,
        long sundayOffCount,
        long completeWeekendOffCount,
        LocalDate lastCompleteWeekendOff,
        List<LocalDate> completeWeekendOffDates
) {
}
