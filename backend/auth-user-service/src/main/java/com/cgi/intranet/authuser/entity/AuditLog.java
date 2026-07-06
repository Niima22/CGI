package com.cgi.intranet.authuser.entity;

import com.cgi.intranet.authuser.enums.AuditAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private AuditAction action;

    @Column(name = "performed_by", nullable = false)
    private String performedBy;

    @Column(name = "target_user", nullable = false)
    private String targetUser;

    @Column(name = "old_value", length = 512)
    private String oldValue;

    @Column(name = "new_value", length = 512)
    private String newValue;

    @Column(nullable = false, length = 64)
    private String module;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    protected AuditLog() {
    }

    public AuditLog(
            AuditAction action,
            String performedBy,
            String targetUser,
            String oldValue,
            String newValue,
            String module
    ) {
        this.action = action;
        this.performedBy = performedBy;
        this.targetUser = targetUser;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.module = module;
    }

    @PrePersist
    void onCreate() {
        timestamp = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public AuditAction getAction() {
        return action;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public String getTargetUser() {
        return targetUser;
    }

    public String getOldValue() {
        return oldValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public String getModule() {
        return module;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}
