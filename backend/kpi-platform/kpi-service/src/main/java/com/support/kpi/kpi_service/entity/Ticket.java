package com.support.kpi.kpi_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", unique = true, nullable = false)
    private Long ticketId;

    @Column(name = "type_ticket", nullable = false)
    private String typeTicket;

    @Column(name = "type_categorie")
    private String typeCategorie;

    @Column(name = "digital_support")
    private String digitalSupport;

    @Column(name = "bannette_grafana")
    private String bannetteGrafana;

    @Column(name = "equipe_ds")
    private String equipeDs;

    @Column(name = "domaine")
    private String domaine;

    @Column(name = "priorite_initiale")
    private String prioriteInitiale;

    @Column(name = "priorite")
    private String priorite;

    @Column(name = "equipe_traitante")
    private String equipeTraitante;

    @Column(name = "date_creation")
    private LocalDate dateCreation;

    @Column(name = "date_heure_action")
    private OffsetDateTime dateHeureAction;

    @Column(name = "agent_code_gdi")
    private String agentCodeGdi;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
