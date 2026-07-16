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
@Table(name = "planning_off_day_locks")
public class PlanningOffDayLock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "planning_week_id", nullable = false)
    private Long planningWeekId;

    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    @Column(name = "assignment_date", nullable = false)
    private LocalDate assignmentDate;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected PlanningOffDayLock() {
    }

    public PlanningOffDayLock(Long planningWeekId, Long agentId, LocalDate assignmentDate, String createdBy) {
        this.planningWeekId = planningWeekId;
        this.agentId = agentId;
        this.assignmentDate = assignmentDate;
        this.createdBy = createdBy;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getPlanningWeekId() { return planningWeekId; }
    public Long getAgentId() { return agentId; }
    public LocalDate getAssignmentDate() { return assignmentDate; }
}
