package com.cgi.intranet.authuser.dto.response;

import com.cgi.intranet.authuser.enums.AuditAction;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        AuditAction action,
        String performedBy,
        String targetUser,
        String oldValue,
        String newValue,
        String module,
        LocalDateTime timestamp
) {
}
