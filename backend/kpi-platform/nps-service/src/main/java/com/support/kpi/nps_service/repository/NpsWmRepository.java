package com.support.kpi.nps_service.repository;

import com.support.kpi.nps_service.entity.NpsWm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NpsWmRepository extends JpaRepository<NpsWm, Integer> {
    List<NpsWm> findByEquipeDsCodeAndMois(String equipeDsCode, String mois);
}
