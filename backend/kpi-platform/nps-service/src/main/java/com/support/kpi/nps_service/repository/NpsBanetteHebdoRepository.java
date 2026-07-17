package com.support.kpi.nps_service.repository;

import com.support.kpi.nps_service.entity.NpsBanetteHebdo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NpsBanetteHebdoRepository extends JpaRepository<NpsBanetteHebdo, Integer> {
    List<NpsBanetteHebdo> findBySemaine(String semaine);
}
