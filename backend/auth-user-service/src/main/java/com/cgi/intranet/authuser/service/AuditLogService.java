package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.response.AuditLogResponse;
import com.cgi.intranet.authuser.enums.AuditAction;

import java.util.List;

public interface AuditLogService {

    void log(AuditAction action, String targetUser, String oldValue, String newValue);

    List<AuditLogResponse> getAuditLogs();
}
