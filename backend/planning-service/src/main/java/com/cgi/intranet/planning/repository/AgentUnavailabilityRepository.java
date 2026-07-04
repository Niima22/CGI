package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.AgentUnavailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AgentUnavailabilityRepository extends JpaRepository<AgentUnavailability, Long> {

    List<AgentUnavailability> findByDateBetween(LocalDate start, LocalDate end);

    Optional<AgentUnavailability> findByAgentIdAndDate(Long agentId, LocalDate date);
}
