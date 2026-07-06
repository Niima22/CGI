package com.cgi.intranet.authuser.service.impl;

import com.cgi.intranet.authuser.dto.response.AuditLogResponse;
import com.cgi.intranet.authuser.entity.AuditLog;
import com.cgi.intranet.authuser.enums.AuditAction;
import com.cgi.intranet.authuser.repository.AuditLogRepository;
import com.cgi.intranet.authuser.service.AuditLogService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AuditLogServiceImpl implements AuditLogService {

    private static final String MODULE = "AUTH_USER";
    private static final String SYSTEM_ACTOR = "system";

    private final AuditLogRepository auditLogRepository;

    public AuditLogServiceImpl(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional
    public void log(AuditAction action, String targetUser, String oldValue, String newValue) {
        AuditLog auditLog = new AuditLog(
                action,
                resolveActor(),
                targetUser,
                oldValue,
                newValue,
                MODULE
        );
        auditLogRepository.save(auditLog);
    }

    @Override
    public List<AuditLogResponse> getAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(auditLog -> new AuditLogResponse(
                        auditLog.getId(),
                        auditLog.getAction(),
                        auditLog.getPerformedBy(),
                        auditLog.getTargetUser(),
                        auditLog.getOldValue(),
                        auditLog.getNewValue(),
                        auditLog.getModule(),
                        auditLog.getTimestamp()
                ))
                .toList();
    }

    private String resolveActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return SYSTEM_ACTOR;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) {
                return email;
            }
            String username = jwt.getClaimAsString("preferred_username");
            if (username != null && !username.isBlank()) {
                return username;
            }
            return jwt.getSubject();
        }

        String name = authentication.getName();
        if (name != null && !name.isBlank()) {
            return name;
        }

        return SYSTEM_ACTOR;
    }
}
