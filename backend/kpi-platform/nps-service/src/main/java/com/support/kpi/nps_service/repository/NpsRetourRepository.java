package com.support.kpi.nps_service.repository;

import com.support.kpi.nps_service.entity.NpsRetour;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface NpsRetourRepository extends JpaRepository<NpsRetour, Long> {
    List<NpsRetour> findByAgentCodeGdiAndDateRetourNpsBetween(String agentCodeGdi, LocalDate from, LocalDate to);
    List<NpsRetour> findByResoluParGrafana(String resoluParGrafana);
    List<NpsRetour> findByEquipeDsAndDateRetourNpsBetween(String equipeDs, LocalDate from, LocalDate to);

    @Query("SELECT r FROM NpsRetour r WHERE r.agentCodeGdi IS NULL AND r.resoluParGrafana = :loginGrafana")
    List<NpsRetour> findUnresolvedByLoginGrafana(@Param("loginGrafana") String loginGrafana);
}
