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
@Table(name = "planning_assignment_freezes")
public class PlanningAssignmentFreeze {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "shift_id")
    private Long shiftId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected PlanningAssignmentFreeze() {
    }

    public PlanningAssignmentFreeze(Long agentId, int dayOfWeek, Long shiftId, LocalDate startDate, String createdBy) {
        this(agentId, dayOfWeek, shiftId, startDate, null, createdBy);
    }

    public PlanningAssignmentFreeze(
            Long agentId,
            int dayOfWeek,
            Long shiftId,
            LocalDate startDate,
            LocalDate endDate,
            String createdBy
    ) {
        this.agentId = agentId;
        this.dayOfWeek = dayOfWeek;
        this.shiftId = shiftId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdBy = createdBy;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getAgentId() {
        return agentId;
    }

    public int getDayOfWeek() {
        return dayOfWeek;
    }

    public Long getShiftId() {
        return shiftId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public boolean isActive() {
        return active;
    }

    public void deactivate(LocalDate endDate) {
        this.active = false;
        this.endDate = endDate;
    }
}
