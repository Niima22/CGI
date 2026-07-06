package com.cgi.intranet.ticket.entity;

import com.cgi.intranet.ticket.enums.SlaStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_sla")
public class TicketSla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false, unique = true)
    private Long ticketId;

    @Column(name = "policy_id")
    private Long policyId;

    @Column(name = "response_deadline")
    private LocalDateTime responseDeadline;

    @Column(name = "resolution_deadline")
    private LocalDateTime resolutionDeadline;

    @Column(name = "first_response_at")
    private LocalDateTime firstResponseAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_status", nullable = false, length = 20)
    private SlaStatus responseStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_status", nullable = false, length = 20)
    private SlaStatus resolutionStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "global_status", nullable = false, length = 20)
    private SlaStatus globalStatus;

    @Column(name = "elapsed_minutes")
    private Long elapsedMinutes;

    @Column(name = "remaining_minutes")
    private Long remainingMinutes;

    @Column(name = "consumed_percentage")
    private Double consumedPercentage;

    @Column(name = "breach_reason", length = 1000)
    private String breachReason;

    @Column(name = "last_calculated_at", nullable = false)
    private LocalDateTime lastCalculatedAt;

    @Column(name = "escalation_level", nullable = false)
    private Integer escalationLevel;

    @Column(name = "last_alert_at")
    private LocalDateTime lastAlertAt;

    @Column(name = "last_escalation_at")
    private LocalDateTime lastEscalationAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (escalationLevel == null) {
            escalationLevel = 0;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getTicketId() {
        return ticketId;
    }

    public void setTicketId(Long ticketId) {
        this.ticketId = ticketId;
    }

    public Long getPolicyId() {
        return policyId;
    }

    public void setPolicyId(Long policyId) {
        this.policyId = policyId;
    }

    public LocalDateTime getResponseDeadline() {
        return responseDeadline;
    }

    public void setResponseDeadline(LocalDateTime responseDeadline) {
        this.responseDeadline = responseDeadline;
    }

    public LocalDateTime getResolutionDeadline() {
        return resolutionDeadline;
    }

    public void setResolutionDeadline(LocalDateTime resolutionDeadline) {
        this.resolutionDeadline = resolutionDeadline;
    }

    public LocalDateTime getFirstResponseAt() {
        return firstResponseAt;
    }

    public void setFirstResponseAt(LocalDateTime firstResponseAt) {
        this.firstResponseAt = firstResponseAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public SlaStatus getResponseStatus() {
        return responseStatus;
    }

    public void setResponseStatus(SlaStatus responseStatus) {
        this.responseStatus = responseStatus;
    }

    public SlaStatus getResolutionStatus() {
        return resolutionStatus;
    }

    public void setResolutionStatus(SlaStatus resolutionStatus) {
        this.resolutionStatus = resolutionStatus;
    }

    public SlaStatus getGlobalStatus() {
        return globalStatus;
    }

    public void setGlobalStatus(SlaStatus globalStatus) {
        this.globalStatus = globalStatus;
    }

    public Long getElapsedMinutes() {
        return elapsedMinutes;
    }

    public void setElapsedMinutes(Long elapsedMinutes) {
        this.elapsedMinutes = elapsedMinutes;
    }

    public Long getRemainingMinutes() {
        return remainingMinutes;
    }

    public void setRemainingMinutes(Long remainingMinutes) {
        this.remainingMinutes = remainingMinutes;
    }

    public Double getConsumedPercentage() {
        return consumedPercentage;
    }

    public void setConsumedPercentage(Double consumedPercentage) {
        this.consumedPercentage = consumedPercentage;
    }

    public String getBreachReason() {
        return breachReason;
    }

    public void setBreachReason(String breachReason) {
        this.breachReason = breachReason;
    }

    public LocalDateTime getLastCalculatedAt() {
        return lastCalculatedAt;
    }

    public void setLastCalculatedAt(LocalDateTime lastCalculatedAt) {
        this.lastCalculatedAt = lastCalculatedAt;
    }

    public Integer getEscalationLevel() {
        return escalationLevel;
    }

    public void setEscalationLevel(Integer escalationLevel) {
        this.escalationLevel = escalationLevel;
    }

    public LocalDateTime getLastAlertAt() {
        return lastAlertAt;
    }

    public void setLastAlertAt(LocalDateTime lastAlertAt) {
        this.lastAlertAt = lastAlertAt;
    }

    public LocalDateTime getLastEscalationAt() {
        return lastEscalationAt;
    }

    public void setLastEscalationAt(LocalDateTime lastEscalationAt) {
        this.lastEscalationAt = lastEscalationAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
