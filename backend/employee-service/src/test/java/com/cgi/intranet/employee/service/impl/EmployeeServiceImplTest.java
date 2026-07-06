package com.cgi.intranet.employee.service.impl;

import com.cgi.intranet.employee.dto.request.CreateEmployeeRequest;
import com.cgi.intranet.employee.dto.request.UpdateMyProfileRequest;
import com.cgi.intranet.employee.dto.request.UpdateMyAvailabilityStatusRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeBannetteRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeDepartmentRequest;
import com.cgi.intranet.employee.dto.response.EmployeeResponse;
import com.cgi.intranet.employee.entity.Department;
import com.cgi.intranet.employee.entity.Employee;
import com.cgi.intranet.employee.enums.AvailabilityStatus;
import com.cgi.intranet.employee.enums.EmployeeStatus;
import com.cgi.intranet.employee.repository.DepartmentRepository;
import com.cgi.intranet.employee.repository.EmployeeRepository;
import com.cgi.intranet.employee.service.ProfilePhotoStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceImplTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private ProfilePhotoStorageService profilePhotoStorageService;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    @Test
    void getAllEmployeesMapsEntitiesManually() {
        when(employeeRepository.findAll()).thenReturn(List.of(employee()));

        List<EmployeeResponse> employees = employeeService.getAllEmployees();

        assertThat(employees).hasSize(1);
        assertThat(employees.get(0).userKeycloakId()).isEqualTo("keycloak-1");
        assertThat(employees.get(0).email()).isEqualTo("employee@test.com");
        assertThat(employees.get(0).bannette()).isEqualTo("FO");
        assertThat(employees.get(0).status()).isEqualTo(EmployeeStatus.ACTIVE);
        assertThat(employees.get(0).availabilityStatus()).isEqualTo(AvailabilityStatus.OFFLINE);
    }

    @Test
    void getCurrentEmployeeFallsBackToEmail() {
        when(employeeRepository.findByUserKeycloakId("missing")).thenReturn(Optional.empty());
        when(employeeRepository.findByEmail("employee@test.com")).thenReturn(Optional.of(employee()));

        EmployeeResponse employee = employeeService.getCurrentEmployee("missing", "employee@test.com");

        assertThat(employee.userKeycloakId()).isEqualTo("keycloak-1");
        verify(employeeRepository).findByEmail("employee@test.com");
    }

    @Test
    void createEmployeeRejectsDuplicateUserKeycloakId() {
        CreateEmployeeRequest request = createRequest();
        when(employeeRepository.existsByUserKeycloakId("keycloak-1")).thenReturn(true);

        assertThatThrownBy(() -> employeeService.createEmployee(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Employee already exists for userKeycloakId");
    }

    @Test
    void createEmployeeSavesNewEmployee() {
        CreateEmployeeRequest request = createRequest();
        when(employeeRepository.existsByUserKeycloakId("keycloak-1")).thenReturn(false);
        when(employeeRepository.existsByEmail("employee@test.com")).thenReturn(false);
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeResponse employee = employeeService.createEmployee(request);

        assertThat(employee.userKeycloakId()).isEqualTo("keycloak-1");
        assertThat(employee.jobTitle()).isEqualTo("Developer");
        assertThat(employee.department()).isEqualTo("Engineering");
        assertThat(employee.bannette()).isEqualTo("FO");
    }

    @Test
    void supervisorCannotUpdateBannetteOutsideScope() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee()));

        assertThatThrownBy(() -> employeeService.updateEmployeeBannette(
                1L,
                new UpdateEmployeeBannetteRequest("BO"),
                "other-manager",
                false
        ))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Employee is outside supervisor scope");
    }

    @Test
    void currentUserCanUpdateOwnAvailabilityStatus() {
        Employee employee = employee();
        when(employeeRepository.findByUserKeycloakId("keycloak-1")).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeResponse response = employeeService.updateCurrentAvailabilityStatus(
                "keycloak-1",
                "employee@test.com",
                new UpdateMyAvailabilityStatusRequest(AvailabilityStatus.BREAK)
        );

        assertThat(response.availabilityStatus()).isEqualTo(AvailabilityStatus.BREAK);
    }

    @Test
    void currentUserCanUpdateOwnSafeProfileFieldsOnly() {
        Employee employee = employee();
        when(employeeRepository.findByUserKeycloakId("keycloak-1")).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeResponse response = employeeService.updateCurrentProfile(
                "keycloak-1",
                "employee@test.com",
                new UpdateMyProfileRequest(
                        "+212600000000",
                        "456 New Street",
                        "Support specialist",
                        "https://example.com/avatar.jpg"
                )
        );

        assertThat(response.phone()).isEqualTo("+212600000000");
        assertThat(response.address()).isEqualTo("456 New Street");
        assertThat(response.bio()).isEqualTo("Support specialist");
        assertThat(response.profilePhotoUrl()).isEqualTo("https://example.com/avatar.jpg");
        assertThat(response.jobTitle()).isEqualTo("Developer");
        assertThat(response.department()).isEqualTo("Engineering");
        assertThat(response.email()).isEqualTo("employee@test.com");
    }

    @Test
    void adminCanAssignEmployeeToActiveDepartment() {
        Employee employee = employee();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(departmentRepository.findById(5L)).thenReturn(Optional.of(new Department(
                "Support",
                "Support department",
                true,
                "manager-1"
        )));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeResponse response = employeeService.updateEmployeeDepartment(
                1L,
                new UpdateEmployeeDepartmentRequest(5L)
        );

        assertThat(response.department()).isEqualTo("Support");
    }

    @Test
    void currentUserCanUploadOwnProfilePhoto() throws Exception {
        Employee employee = employee();
        when(employeeRepository.findByUserKeycloakId("keycloak-1")).thenReturn(Optional.of(employee));
        when(profilePhotoStorageService.store(any())).thenReturn("http://localhost:8082/uploads/profiles/avatar.jpg");
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeResponse response = employeeService.updateCurrentProfilePhoto(
                "keycloak-1",
                "employee@test.com",
                new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1, 2, 3})
        );

        assertThat(response.profilePhotoUrl()).isEqualTo("http://localhost:8082/uploads/profiles/avatar.jpg");
    }

    private Employee employee() {
        return new Employee(
                "keycloak-1",
                "Employee User",
                "employee@test.com",
                "Developer",
                "Engineering",
                "FO",
                null,
                null,
                "manager-1",
                "0600000000",
                "123 Main St",
                "Existing bio",
                "https://example.com/current.jpg",
                33.5731,
                -7.5898,
                EmployeeStatus.ACTIVE
        );
    }

    private CreateEmployeeRequest createRequest() {
        return new CreateEmployeeRequest(
                "keycloak-1",
                "Employee User",
                "employee@test.com",
                "Developer",
                "Engineering",
                "FO",
                null,
                null,
                "manager-1",
                "123 Main St",
                33.5731,
                -7.5898,
                EmployeeStatus.ACTIVE
        );
    }
}
