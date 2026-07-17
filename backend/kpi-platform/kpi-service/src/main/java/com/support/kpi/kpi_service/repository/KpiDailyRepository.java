package com.support.kpi.kpi_service.repository;

import com.support.kpi.kpi_service.entity.KpiDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface KpiDailyRepository extends JpaRepository<KpiDaily, Long> {
    List<KpiDaily> findByAgentCodeGdiAndDateKpiBetween(String agentCodeGdi, LocalDate from, LocalDate to);
    List<KpiDaily> findByDateKpiBetween(LocalDate from, LocalDate to);
    List<KpiDaily> findByAgentCodeGdiAndSemaine(String agentCodeGdi, String semaine);
    List<KpiDaily> findBySemaine(String semaine);

    @Query("SELECT k FROM KpiDaily k WHERE k.agentCodeGdi IS NULL AND k.agentNomNormalise = :nomNormalise")
    List<KpiDaily> findUnresolvedByNomNormalise(@Param("nomNormalise") String nomNormalise);
}
