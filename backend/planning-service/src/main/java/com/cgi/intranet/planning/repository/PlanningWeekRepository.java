package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.PlanningWeek;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

public interface PlanningWeekRepository extends JpaRepository<PlanningWeek, Long> {

    Optional<PlanningWeek> findByWeekStartDate(LocalDate weekStartDate);

    Optional<PlanningWeek> findById(Long id);

    List<PlanningWeek> findByWeekStartDateBetween(LocalDate start, LocalDate end);
}
