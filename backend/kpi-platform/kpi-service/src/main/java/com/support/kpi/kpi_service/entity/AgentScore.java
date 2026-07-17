package com.support.kpi.kpi_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "agent_scores", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"agent_code_gdi", "periode_debut", "type_periode"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "agent_code_gdi", nullable = false)
    private String agentCodeGdi;

    @Column(name = "agent_nom_complet")
    private String agentNomComplet;

    @Column(name = "equipe_ds")
    private String equipeDs;

    @Column(name = "periode_debut", nullable = false)
    private LocalDate periodeDebut;

    @Column(name = "periode_fin", nullable = false)
    private LocalDate periodeFin;

    @Column(name = "type_periode", nullable = false)
    private String typePeriod; // 'DAILY', 'WEEKLY', 'MONTHLY'

    @Column(name = "score_resolution")
    private BigDecimal scoreResolution;

    @Column(name = "score_qs")
    private BigDecimal scoreQs;

    @Column(name = "score_nps")
    private BigDecimal scoreNps;

    @Column(name = "score_volume")
    private BigDecimal scoreVolume;

    @Column(name = "score_global")
    private BigDecimal scoreGlobal;

    @Column(name = "classement_equipe")
    private Integer classementEquipe;

    @Column(name = "classement_global")
    private Integer classementGlobal;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
