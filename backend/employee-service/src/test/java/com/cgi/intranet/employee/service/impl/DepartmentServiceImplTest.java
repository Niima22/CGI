package com.cgi.intranet.employee.service.impl;

import com.cgi.intranet.employee.dto.request.CreateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentStatusRequest;
import com.cgi.intranet.employee.dto.response.DepartmentResponse;
import com.cgi.intranet.employee.entity.Department;
import com.cgi.intranet.employee.repository.DepartmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceImplTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private DepartmentServiceImpl departmentService;

    @Test
    void adminCanCreateDepartment() {
        when(departmentRepository.existsByNameIgnoreCase("Support")).thenReturn(false);
        when(departmentRepository.save(any(Department.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DepartmentResponse response = departmentService.createDepartment(
                new CreateDepartmentRequest("Support", "Support department", "manager-1")
        );

        assertThat(response.name()).isEqualTo("Support");
        assertThat(response.active()).isTrue();
    }

    @Test
    void adminCanUpdateDepartment() {
        Department department = new Department("Support", "Old", true, "manager-1");
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(departmentRepository.findByNameIgnoreCase("Customer Care")).thenReturn(Optional.empty());
        when(departmentRepository.save(any(Department.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DepartmentResponse response = departmentService.updateDepartment(
                1L,
                new UpdateDepartmentRequest("Customer Care", "Updated", "manager-2")
        );

        assertThat(response.name()).isEqualTo("Customer Care");
        assertThat(response.description()).isEqualTo("Updated");
        assertThat(response.managerKeycloakId()).isEqualTo("manager-2");
    }

    @Test
    void adminCanDeactivateDepartment() {
        Department department = new Department("Support", "Old", true, "manager-1");
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(departmentRepository.save(any(Department.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DepartmentResponse response = departmentService.updateDepartmentStatus(
                1L,
                new UpdateDepartmentStatusRequest(false)
        );

        assertThat(response.active()).isFalse();
    }

    @Test
    void duplicateDepartmentNameIsRejected() {
        when(departmentRepository.existsByNameIgnoreCase("Support")).thenReturn(true);

        assertThatThrownBy(() -> departmentService.createDepartment(
                new CreateDepartmentRequest("Support", "Support department", null)
        ))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Department already exists");
    }
}
