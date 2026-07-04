package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.ShiftSwapRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftSwapRequestRepository extends JpaRepository<ShiftSwapRequest, Long> {

    List<ShiftSwapRequest> findByOrderByCreatedAtDesc();

    List<ShiftSwapRequest> findByRequesterAgentIdOrTargetAgentIdOrderByCreatedAtDesc(
            Long requesterAgentId,
            Long targetAgentId
    );
}
