package com.support.kpi.nps_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "nps_wm", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"equipe_ds_label", "mois", "annee"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NpsWm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "equipe_ds_label", nullable = false)
    private String equipeDsLabel;

    @Column(name = "equipe_ds_code")
    private String equipeDsCode;

    @Column(nullable = false)
    private String mois;

    private Short annee;

    @Column(name = "mois_num")
    private Short moisNum;

    @Column(name = "nb_promoteurs")
    private Integer nbPromoteurs;

    @Column(name = "nb_neutres")
    private Integer nbNeutres;

    @Column(name = "nb_detracteurs")
    private Integer nbDetracteurs;

    @Column(name = "nps_net")
    private BigDecimal npsNet;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
