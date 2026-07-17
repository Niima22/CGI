package com.support.kpi.kpi_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "alertes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alerte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type_alerte", nullable = false)
    private String typeAlerte; // 'TAUX_ESCALADE','QS','NPS','VOLUME','EAT'

    @Column(name = "agent_code_gdi")
    private String agentCodeGdi;

    @Column(name = "equipe_ds")
    private String equipeDs;

    @Column(name = "valeur_actuelle")
    private BigDecimal valeurActuelle;

    @Column(name = "seuil_alerte")
    private BigDecimal seuilAlerte;

    @Column(nullable = false)
    private String niveau; // 'CRITIQUE','ALERTE','ATTENTION'

    private String message;

    @Column(name = "date_alerte", nullable = false)
    private LocalDate dateAlerte;

    @Column(nullable = false)
    private Boolean resolue;

    @Column(name = "date_resolution")
    private LocalDate dateResolution;

    @Column(name = "resolue_par")
    private UUID resoluePar;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
