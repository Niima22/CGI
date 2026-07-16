package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.TeleworkRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TeleworkRequestRepository extends JpaRepository<TeleworkRequest, Long> {

    List<TeleworkRequest> findByDateBetweenOrderByCreatedAtDesc(LocalDate start, LocalDate end);

    List<TeleworkRequest> findByAgentIdAndDateBetweenOrderByCreatedAtDesc(
            Long agentId,
            LocalDate start,
            LocalDate end
    );

    List<TeleworkRequest> findByStatusAndDateBetweenOrderByCreatedAtDesc(
            String status,
            LocalDate start,
            LocalDate end
    );
}
