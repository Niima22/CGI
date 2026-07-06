package com.cgi.intranet.employee.controller;

import com.cgi.intranet.employee.dto.request.CreateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentStatusRequest;
import com.cgi.intranet.employee.dto.response.DepartmentResponse;
import com.cgi.intranet.employee.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getDepartments(
            @RequestParam(name = "includeInactive", defaultValue = "true") boolean includeInactive
    ) {
        return ResponseEntity.ok(departmentService.getDepartments(includeInactive));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getDepartmentById(@PathVariable Long id) {
        return ResponseEntity.ok(departmentService.getDepartmentById(id));
    }

    @PostMapping
    public ResponseEntity<DepartmentResponse> createDepartment(@Valid @RequestBody CreateDepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.createDepartment(request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DepartmentResponse> updateDepartment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDepartmentRequest request
    ) {
        return ResponseEntity.ok(departmentService.updateDepartment(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DepartmentResponse> updateDepartmentStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDepartmentStatusRequest request
    ) {
        return ResponseEntity.ok(departmentService.updateDepartmentStatus(id, request));
    }
}
