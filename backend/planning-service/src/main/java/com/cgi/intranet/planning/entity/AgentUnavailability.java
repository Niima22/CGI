package com.cgi.intranet.planning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "agent_unavailability")
public class AgentUnavailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    @Column(name = "unavailable_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String reason;

    protected AgentUnavailability() {
    }

    public AgentUnavailability(Long agentId, LocalDate date, String reason) {
        this.agentId = agentId;
        this.date = date;
        this.reason = reason;
    }

    public Long getAgentId() {
        return agentId;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
