package com.cgi.intranet.planning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "planning_override_audit")
public class PlanningOverrideAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "planning_week_id", nullable = false)
    private Long planningWeekId;
    @Column(name = "supervisor_identity", nullable = false)
    private String supervisorIdentity;
    @Column(name = "overridden_at", nullable = false)
    private LocalDateTime overriddenAt;
    @Column(name = "agent_id")
    private Long agentId;
    @Column(name = "assignment_date")
    private LocalDate assignmentDate;
    @Column(name = "previous_shift_id")
    private Long previousShiftId;
    @Column(name = "new_shift_id")
    private Long newShiftId;
    @Column(name = "previous_value", nullable = false)
    private String previousValue;
    @Column(name = "new_value", nullable = false)
    private String newValue;
    @Column(name = "violated_rules", nullable = false, columnDefinition = "TEXT")
    private String violatedRules;
    @Column(name = "override_reason", nullable = false, columnDefinition = "TEXT")
    private String overrideReason;

    protected PlanningOverrideAudit() {
    }

    public PlanningOverrideAudit(
            Long planningWeekId, String supervisorIdentity, Long agentId, LocalDate assignmentDate,
            Long previousShiftId, Long newShiftId, String previousValue, String newValue,
            String violatedRules, String overrideReason
    ) {
        this.planningWeekId = planningWeekId;
        this.supervisorIdentity = supervisorIdentity;
        this.agentId = agentId;
        this.assignmentDate = assignmentDate;
        this.previousShiftId = previousShiftId;
        this.newShiftId = newShiftId;
        this.previousValue = previousValue;
        this.newValue = newValue;
        this.violatedRules = violatedRules;
        this.overrideReason = overrideReason;
    }

    @PrePersist
    void onCreate() {
        overriddenAt = LocalDateTime.now();
    }
}
