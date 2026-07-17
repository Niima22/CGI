package com.support.kpi.kpi_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "kpi_daily", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"agent_nom_normalise", "date_kpi"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_nom_complet", nullable = false)
    private String agentNomComplet;

    @Column(name = "agent_nom_normalise")
    private String agentNomNormalise;

    @Column(name = "agent_code_gdi")
    private String agentCodeGdi;

    @Column(name = "date_kpi", nullable = false)
    private LocalDate dateKpi;

    private String semaine;

    @Column(name = "tickets_resolus")
    private Integer ticketsResolus;

    @Column(name = "tickets_escalades")
    private Integer ticketsEscalades;

    @Column(name = "tickets_traites")
    private Integer ticketsTraites;

    @Column(name = "tickets_transferts_internes")
    private Integer ticketsTransfertsInternes;

    @Column(name = "tickets_transferts_externes")
    private Integer ticketsTransfertsExternes;

    @Column(name = "total_tickets")
    private Integer totalTickets;

    @Column(name = "appels_recus")
    private Integer appelsRecus;

    @Column(name = "appels_repondus")
    private Integer appelsRepondus;

    private BigDecimal qs;

    @Column(name = "qs_source_brute")
    private String qsSourceBrute;

    @Column(name = "taux_resolution")
    private BigDecimal tauxResolution;

    @Column(name = "taux_escalade")
    private BigDecimal tauxEscalade;

    @Column(name = "taux_transfert")
    private BigDecimal tauxTransfert;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
