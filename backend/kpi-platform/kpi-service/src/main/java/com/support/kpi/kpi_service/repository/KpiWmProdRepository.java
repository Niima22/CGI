package com.support.kpi.kpi_service.repository;

import com.support.kpi.kpi_service.entity.KpiWmProd;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KpiWmProdRepository extends JpaRepository<KpiWmProd, Integer> {
    List<KpiWmProd> findByAgentCodeGdiAndMois(String agentCodeGdi, String mois);
}
