package com.cgi.intranet.planning.dto.response;

import com.cgi.intranet.planning.enums.ShiftCategory;

public record ShiftResponse(
        Long id,
        String code,
        String name,
        ShiftCategory category,
        String startTime,
        String endTime,
        int paidHours
) {
}
