package com.support.kpi.kpi_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "actions_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActionTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id")
    private Long ticketId;

    @Column(name = "agent_code_gdi", nullable = false)
    private String agentCodeGdi;

    @Column(name = "date_action", nullable = false)
    private LocalDate dateAction;

    @Column(name = "date_heure")
    private OffsetDateTime dateHeure;

    @Column(nullable = false)
    private Short resol;

    @Column(nullable = false)
    private Short esc;

    @Column(name = "trf_int", nullable = false)
    private Short trfInt;

    @Column(name = "trf_ext", nullable = false)
    private Short trfExt;

    @Column(name = "aff_inc", nullable = false)
    private Short affInc;

    @Column(nullable = false)
    private Short eat;

    @Column(name = "bannette_grafana")
    private String bannetteGrafana;

    @Column(name = "equipe_ds")
    private String equipeDs;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
