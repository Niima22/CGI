package com.support.kpi.nps_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "nps_banette_hebdo", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"bannette_grafana", "semaine", "annee"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NpsBanetteHebdo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "bannette_grafana", nullable = false)
    private String bannetteGrafana;

    @Column(name = "equipe_ds")
    private String equipeDs;

    @Column(nullable = false)
    private String semaine;

    @Column(name = "mois_num")
    private Short moisNum;

    private Short annee;

    @Column(name = "nb_promoteurs")
    private Integer nbPromoteurs;

    @Column(name = "nb_neutres")
    private Integer nbNeutres;

    @Column(name = "nb_detracteurs")
    private Integer nbDetracteurs;

    @Column(name = "nps_banette")
    private BigDecimal npsBanette;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
