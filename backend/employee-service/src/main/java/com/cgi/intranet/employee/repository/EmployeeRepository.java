package com.cgi.intranet.employee.repository;

import com.cgi.intranet.employee.entity.Employee;
import com.cgi.intranet.employee.enums.EmployeeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByEmail(String email);

    Optional<Employee> findByFullNameIgnoreCase(String fullName);

    Optional<Employee> findByUserKeycloakId(String userKeycloakId);

    List<Employee> findByManagerKeycloakId(String managerKeycloakId);

    List<Employee> findByBannette(String bannette);

    List<Employee> findByStatus(EmployeeStatus status);

    boolean existsByEmail(String email);

    boolean existsByUserKeycloakId(String userKeycloakId);
}
