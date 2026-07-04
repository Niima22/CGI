package com.cgi.intranet.planning.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "planning_agents")
public class PlanningAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Email
    @Column(unique = true)
    private String email;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "fixed_sco", nullable = false)
    private boolean fixedSco;

    protected PlanningAgent() {
    }

    public PlanningAgent(String fullName, String email) {
        this.fullName = fullName;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isFixedSco() {
        return fixedSco;
    }

    public void setFixedSco(boolean fixedSco) {
        this.fixedSco = fixedSco;
    }
}
