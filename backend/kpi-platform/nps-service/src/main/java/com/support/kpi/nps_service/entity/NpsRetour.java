package com.support.kpi.nps_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "nps_retours")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NpsRetour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date_retour_nps")
    private LocalDate dateRetourNps;

    @Column(name = "ticket_id", unique = true, nullable = false)
    private Long ticketId;

    @Column(name = "type_ticket")
    private String typeTicket; // 'DA', 'DS'

    @Column(name = "service_impactant", length = 500)
    private String serviceImpactant;

    @Column(name = "service_impacte", length = 500)
    private String serviceImpacte;

    @Column(name = "digital_support", length = 200)
    private String digitalSupport;

    @Column(columnDefinition = "TEXT")
    private String categorisation;

    @Column(length = 100)
    private String partenaire;

    @Column(name = "bannette_grafana", length = 500)
    private String bannetteGrafana;

    @Column(name = "equipe_ds", length = 100)
    private String equipeDs;

    @Column(length = 100)
    private String domaine;

    @Column(name = "resolu_par_grafana", nullable = false, length = 250)
    private String resoluParGrafana;

    @Column(name = "agent_code_gdi", length = 50)
    private String agentCodeGdi;

    @Column(nullable = false)
    private Short nps;

    @Column(name = "categorie_nps", insertable = false, updatable = false)
    private String categorieNps; // Generated column

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(length = 250)
    private String repondant;

    @Column(name = "emplacement_repondant", length = 500)
    private String emplacementRepondant;

    @Column(name = "reponse_commentaire", columnDefinition = "TEXT")
    private String reponseCommentaire;

    @Column(name = "etat_ciblage_ttr", length = 100)
    private String etatCiblageTtr;

    @Column(name = "etat_ttr", length = 100)
    private String etatTtr;

    private Short reaffectations;

    private Short relances;

    private Short reouvertures;

    @Column(name = "id_odm")
    private Long idOdm;

    @Column(name = "etat_plan_action", length = 100)
    private String etatPlanAction;

    @Column(name = "categorisation_nps", length = 250)
    private String categorisationNps;

    @Column(name = "suivi_run_manager", length = 250)
    private String suiviRunManager;

    @Column(name = "plan_action_detail", columnDefinition = "TEXT")
    private String planActionDetail;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
