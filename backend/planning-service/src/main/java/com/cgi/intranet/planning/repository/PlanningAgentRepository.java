package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.PlanningAgent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanningAgentRepository extends JpaRepository<PlanningAgent, Long> {

    List<PlanningAgent> findByActiveTrueOrderByFullName();

    Optional<PlanningAgent> findByEmailIgnoreCase(String email);
}
