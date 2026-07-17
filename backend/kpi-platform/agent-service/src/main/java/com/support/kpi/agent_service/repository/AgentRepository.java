package com.support.kpi.agent_service.repository;

import com.support.kpi.agent_service.entity.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentRepository extends JpaRepository<Agent, UUID> {
    boolean existsByMatricule(String matricule);
    Optional<Agent> findByMatricule(String matricule);
    Optional<Agent> findByCodeGdi(String codeGdi);
    Optional<Agent> findByLoginGrafana(String loginGrafana);
    Optional<Agent> findByNomNormalise(String nomNormalise);
    Optional<Agent> findByLogCare(String logCare);
}
