package com.support.kpi.agent_service.repository;

import com.support.kpi.agent_service.entity.EquipeDs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface EquipeRepository extends JpaRepository<EquipeDs, UUID> {
    boolean existsByNomIgnoreCase(String nom);
    java.util.Optional<EquipeDs> findByNomIgnoreCase(String nom);
}
