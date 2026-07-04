package com.cgi.intranet.planning.repository;

import com.cgi.intranet.planning.entity.Shift;
import com.cgi.intranet.planning.enums.ShiftCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    List<Shift> findByActiveTrueOrderByStartTime();

    Optional<Shift> findFirstByCategoryAndActiveTrueOrderByStartTime(ShiftCategory category);
}
