package com.support.kpi.kpi_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "kpi_wm_prod", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"agent_nom_complet", "mois"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiWmProd {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "agent_nom_complet", nullable = false)
    private String agentNomComplet;

    @Column(name = "agent_code_gdi")
    private String agentCodeGdi;

    @Column(nullable = false)
    private String mois;

    private Short annee;

    @Column(name = "mois_num")
    private Short moisNum;

    @Column(name = "pct_resolution")
    private BigDecimal pctResolution;

    @Column(name = "pct_escalade")
    private BigDecimal pctEscalade;

    @Column(name = "pct_transfert")
    private BigDecimal pctTransfert;

    @Column(name = "total_tickets")
    private Integer totalTickets;

    @Column(name = "appels_recus")
    private BigDecimal appelsRecus;

    @Column(name = "appels_repondus")
    private BigDecimal appelsRepondus;

    @Column(name = "qs_mensuel")
    private BigDecimal qsMensuel;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
