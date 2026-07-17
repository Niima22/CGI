package com.support.kpi.agent_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "agents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Agent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String matricule;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    @Column(name = "code_gdi", unique = true)
    private String codeGdi;

    @Column(name = "login_grafana", unique = true)
    private String loginGrafana;

    @Column(name = "log_care", unique = true)
    private String logCare;

    @Column(name = "nom_normalise")
    private String nomNormalise;

    @Column(name = "email")
    private String email;

    @Column(name = "location")
    private String location;

    @Column(name = "svi")
    private String svi;

    @Column(name = "licence")
    private String licence;

    @ManyToOne
    @JoinColumn(name = "equipe_id")
    private EquipeDs equipe;

    @OneToMany(mappedBy = "agent", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ActionPlan> actionPlans;
}
