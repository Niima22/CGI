package com.support.kpi.kpi_service.repository;

import com.support.kpi.kpi_service.entity.Alerte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlerteRepository extends JpaRepository<Alerte, Long> {
    List<Alerte> findByResolue(Boolean resolue);
    List<Alerte> findByEquipeDsAndResolue(String equipeDs, Boolean resolue);
    List<Alerte> findByAgentCodeGdi(String agentCodeGdi);
}
