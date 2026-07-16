package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
            LocalDate end,
            LocalDate start
    );

    List<LeaveRequest> findByAgentIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
            Long agentId,
            LocalDate end,
            LocalDate start
    );

    List<LeaveRequest> findByStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
            String status,
            LocalDate end,
            LocalDate start
    );
}
