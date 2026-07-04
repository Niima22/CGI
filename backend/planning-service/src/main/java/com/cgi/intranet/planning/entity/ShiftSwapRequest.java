package com.cgi.intranet.planning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "planning_shift_swap_requests")
public class ShiftSwapRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requester_agent_id", nullable = false)
    private Long requesterAgentId;

    @Column(name = "target_agent_id", nullable = false)
    private Long targetAgentId;

    @Column(name = "requester_date", nullable = false)
    private LocalDate requesterDate;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(length = 1000)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected ShiftSwapRequest() {
    }

    public ShiftSwapRequest(
            Long requesterAgentId,
            Long targetAgentId,
            LocalDate requesterDate,
            LocalDate targetDate,
            String reason
    ) {
        this.requesterAgentId = requesterAgentId;
        this.targetAgentId = targetAgentId;
        this.requesterDate = requesterDate;
        this.targetDate = targetDate;
        this.reason = reason;
    }

    public Long getId() {
        return id;
    }

    public Long getRequesterAgentId() {
        return requesterAgentId;
    }

    public Long getTargetAgentId() {
        return targetAgentId;
    }

    public LocalDate getRequesterDate() {
        return requesterDate;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public String getStatus() {
        return status;
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
