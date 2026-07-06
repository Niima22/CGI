package com.cgi.intranet.employee.service.impl;

import com.cgi.intranet.employee.dto.request.CreateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentStatusRequest;
import com.cgi.intranet.employee.dto.response.DepartmentResponse;
import com.cgi.intranet.employee.entity.Department;
import com.cgi.intranet.employee.repository.DepartmentRepository;
import com.cgi.intranet.employee.service.DepartmentService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentServiceImpl(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Override
    public List<DepartmentResponse> getDepartments(boolean includeInactive) {
        List<Department> departments = includeInactive
                ? departmentRepository.findAll()
                : departmentRepository.findByActiveTrue();
        return departments.stream().map(this::toResponse).toList();
    }

    @Override
    public DepartmentResponse getDepartmentById(Long id) {
        return toResponse(findDepartment(id));
    }

    @Override
    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest request) {
        String name = normalizeName(request.name());
        if (departmentRepository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Department already exists");
        }

        Department department = new Department(
                name,
                clean(request.description()),
                true,
                clean(request.managerKeycloakId())
        );
        return toResponse(departmentRepository.save(department));
    }

    @Override
    @Transactional
    public DepartmentResponse updateDepartment(Long id, UpdateDepartmentRequest request) {
        Department department = findDepartment(id);
        String name = normalizeName(request.name());
        departmentRepository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Department already exists");
                });

        department.setName(name);
        department.setDescription(clean(request.description()));
        department.setManagerKeycloakId(clean(request.managerKeycloakId()));
        return toResponse(departmentRepository.save(department));
    }

    @Override
    @Transactional
    public DepartmentResponse updateDepartmentStatus(Long id, UpdateDepartmentStatusRequest request) {
        Department department = findDepartment(id);
        department.setActive(Boolean.TRUE.equals(request.active()));
        return toResponse(departmentRepository.save(department));
    }

    private Department findDepartment(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
    }

    private DepartmentResponse toResponse(Department department) {
        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                department.getDescription(),
                department.isActive(),
                department.getManagerKeycloakId(),
                department.getCreatedAt(),
                department.getUpdatedAt()
        );
    }

    private String normalizeName(String value) {
        String cleaned = clean(value);
        return cleaned == null ? null : cleaned.replaceAll("\\s+", " ");
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
