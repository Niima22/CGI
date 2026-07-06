package com.cgi.intranet.employee.repository;

import com.cgi.intranet.employee.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByNameIgnoreCase(String name);

    List<Department> findByActiveTrue();

    boolean existsByNameIgnoreCase(String name);
}
