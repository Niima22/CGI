package com.support.kpi.kpi_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "kpi_appels_daily", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"equipe_ds", "source_appels", "date_kpi"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiAppelsDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "equipe_ds", nullable = false)
    private String equipeDs;

    @Column(name = "source_appels", nullable = false)
    private String sourceAppels;

    @Column(name = "date_kpi", nullable = false)
    private LocalDate dateKpi;

    private String semaine;

    @Column(name = "appels_comptabilises")
    private Integer appelsComptabilises;

    @Column(name = "appels_repondus")
    private Integer appelsRepondus;

    @Column(name = "appels_perdus")
    private Integer appelsPerdus;

    @Column(name = "appels_abandonnes")
    private Integer appelsAbandonnes;

    @Column(name = "taux_decroche")
    private BigDecimal tauxDecroche;

    @Column(name = "taux_perdus")
    private BigDecimal tauxPerdus;

    @Column(name = "duree_attente_moy_sec")
    private Integer dureeAttenteMoySec;

    @Column(name = "duree_traitement_moy_sec")
    private Integer dureeTraitementMoySec;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
