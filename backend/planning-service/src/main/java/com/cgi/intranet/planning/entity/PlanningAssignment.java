package com.cgi.intranet.planning.entity;

import com.cgi.intranet.planning.enums.ShiftCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "planning_assignments")
public class PlanningAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "planning_week_id", nullable = false)
    private Long planningWeekId;

    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    @Column(name = "shift_id", nullable = false)
    private Long shiftId;

    @Column(name = "shift_code", nullable = false)
    private String shiftCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift_category", nullable = false)
    private ShiftCategory shiftCategory;

    @Column(name = "assignment_date", nullable = false)
    private LocalDate assignmentDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "paid_hours", nullable = false)
    private int paidHours;

    @Column(name = "lateness_minutes", nullable = false)
    private int latenessMinutes;

    @Column(nullable = false)
    private boolean locked;

    @Column(nullable = false)
    private boolean generated;

    @Column(name = "manually_overridden", nullable = false)
    private boolean manuallyOverridden;

    protected PlanningAssignment() {
    }

    public PlanningAssignment(Long planningWeekId, Long agentId, Shift shift, LocalDate assignmentDate, boolean locked, boolean generated) {
        this.planningWeekId = planningWeekId;
        this.agentId = agentId;
        this.shiftId = shift.getId();
        this.shiftCode = shift.getCode();
        this.shiftCategory = shift.getCategory();
        this.assignmentDate = assignmentDate;
        this.startTime = shift.getStartTime();
        this.endTime = shift.getEndTime();
        this.paidHours = shift.getPaidHours();
        this.locked = locked;
        this.generated = generated;
    }

    public Long getId() {
        return id;
    }

    public Long getPlanningWeekId() {
        return planningWeekId;
    }

    public Long getAgentId() {
        return agentId;
    }

    public Long getShiftId() {
        return shiftId;
    }

    public String getShiftCode() {
        return shiftCode;
    }

    public ShiftCategory getShiftCategory() {
        return shiftCategory;
    }

    public LocalDate getAssignmentDate() {
        return assignmentDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public int getPaidHours() {
        return paidHours;
    }

    public int getLatenessMinutes() {
        return latenessMinutes;
    }

    public boolean isLocked() {
        return locked;
    }

    public boolean isGenerated() {
        return generated;
    }

    public boolean isManuallyOverridden() {
        return manuallyOverridden;
    }

    public void setLocked(boolean locked) {
        this.locked = locked;
    }

    public void setLatenessMinutes(int latenessMinutes) {
        this.latenessMinutes = Math.max(0, latenessMinutes);
        this.manuallyOverridden = this.manuallyOverridden || this.latenessMinutes > 0;
    }

    public void setAgentId(Long agentId) {
        this.agentId = agentId;
        this.generated = false;
        this.manuallyOverridden = true;
    }

    public void copyShiftFrom(PlanningAssignment assignment) {
        replaceShift(
                assignment.shiftId,
                assignment.shiftCode,
                assignment.shiftCategory,
                assignment.startTime,
                assignment.endTime,
                assignment.paidHours
        );
    }

    public void replaceShift(
            Long shiftId,
            String shiftCode,
            ShiftCategory shiftCategory,
            LocalTime startTime,
            LocalTime endTime,
            int paidHours
    ) {
        this.shiftId = shiftId;
        this.shiftCode = shiftCode;
        this.shiftCategory = shiftCategory;
        this.startTime = startTime;
        this.endTime = endTime;
        this.paidHours = paidHours;
        this.generated = false;
        this.manuallyOverridden = true;
    }

    public void markManuallyOverridden() {
        this.manuallyOverridden = true;
    }
}
