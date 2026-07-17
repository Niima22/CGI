package com.support.kpi.kpi_service.repository;

import com.support.kpi.kpi_service.entity.AgentScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AgentScoreRepository extends JpaRepository<AgentScore, Integer> {
    List<AgentScore> findByAgentCodeGdiAndTypePeriod(String agentCodeGdi, String typePeriod);

    @Query("SELECT s FROM AgentScore s WHERE s.typePeriod = :typePeriod AND s.periodeDebut = :debut ORDER BY s.scoreGlobal DESC")
    List<AgentScore> getLeaderboard(@Param("typePeriod") String typePeriod, @Param("debut") LocalDate debut);

    @Query("SELECT s FROM AgentScore s WHERE s.equipeDs = :equipe AND s.typePeriod = :typePeriod AND s.periodeDebut = :debut ORDER BY s.scoreGlobal DESC")
    List<AgentScore> getLeaderboardByEquipe(@Param("equipe") String equipe, @Param("typePeriod") String typePeriod, @Param("debut") LocalDate debut);
}
