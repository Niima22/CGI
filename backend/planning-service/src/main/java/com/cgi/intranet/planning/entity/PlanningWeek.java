package com.cgi.intranet.planning.entity;

import com.cgi.intranet.planning.enums.PlanningStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "planning_weeks")
public class PlanningWeek {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "week_start_date", nullable = false, unique = true)
    private LocalDate weekStartDate;

    @Column(name = "week_end_date", nullable = false)
    private LocalDate weekEndDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanningStatus status = PlanningStatus.DRAFT;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "manually_overridden", nullable = false)
    private boolean manuallyOverridden;

    protected PlanningWeek() {
    }

    public PlanningWeek(LocalDate weekStartDate, PlanningStatus status) {
        this.weekStartDate = weekStartDate;
        this.weekEndDate = weekStartDate.plusDays(6);
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        generatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public LocalDate getWeekStartDate() {
        return weekStartDate;
    }

    public LocalDate getWeekEndDate() {
        return weekEndDate;
    }

    public PlanningStatus getStatus() {
        return status;
    }

    public void publish() {
        this.status = PlanningStatus.PUBLISHED;
    }

    public void markDraft() {
        this.status = PlanningStatus.DRAFT;
    }

    public boolean isManuallyOverridden() {
        return manuallyOverridden;
    }

    public void markManuallyOverridden() {
        this.manuallyOverridden = true;
    }
}
