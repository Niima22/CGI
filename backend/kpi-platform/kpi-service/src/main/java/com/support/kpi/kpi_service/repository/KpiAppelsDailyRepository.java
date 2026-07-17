package com.support.kpi.kpi_service.repository;

import com.support.kpi.kpi_service.entity.KpiAppelsDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface KpiAppelsDailyRepository extends JpaRepository<KpiAppelsDaily, Long> {
    List<KpiAppelsDaily> findByEquipeDsAndDateKpiBetween(String equipeDs, LocalDate from, LocalDate to);
}
