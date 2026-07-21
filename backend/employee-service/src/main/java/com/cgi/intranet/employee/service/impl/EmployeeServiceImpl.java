package com.cgi.intranet.employee.service.impl;

import com.cgi.intranet.employee.dto.request.CreateEmployeeRequest;
import com.cgi.intranet.employee.dto.request.ConfirmEmployeeImportRequest;
import com.cgi.intranet.employee.dto.request.LinkEmployeeUserRequest;
import com.cgi.intranet.employee.dto.request.UpdateMyProfileRequest;
import com.cgi.intranet.employee.dto.request.UpdateMyAvailabilityStatusRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeBannetteRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeManagerRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeStatusRequest;
import com.cgi.intranet.employee.dto.response.EmployeeImportPreviewItem;
import com.cgi.intranet.employee.dto.response.EmployeeImportPreviewResponse;
import com.cgi.intranet.employee.dto.response.EmployeeResponse;
import com.cgi.intranet.employee.entity.Employee;
import com.cgi.intranet.employee.repository.EmployeeRepository;
import com.cgi.intranet.employee.repository.DepartmentRepository;
import com.cgi.intranet.employee.service.EmployeeService;
import com.cgi.intranet.employee.service.ProfilePhotoStorageService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final ProfilePhotoStorageService profilePhotoStorageService;

    public EmployeeServiceImpl(
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            ProfilePhotoStorageService profilePhotoStorageService
    ) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.profilePhotoStorageService = profilePhotoStorageService;
    }

    @Override
    public List<EmployeeResponse> getAllEmployees() {
        return employeeRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<EmployeeResponse> getEmployeesForRequester(String requesterKeycloakId, boolean globalAccess) {
        if (globalAccess) {
            return getAllEmployees();
        }
        return employeeRepository.findByManagerKeycloakId(requesterKeycloakId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public EmployeeResponse getEmployeeById(Long id) {
        return toResponse(findEmployeeById(id));
    }

    @Override
    public EmployeeResponse getEmployeeByIdForRequester(Long id, String requesterKeycloakId, boolean globalAccess) {
        Employee employee = findEmployeeById(id);
        if (!globalAccess && !requesterKeycloakId.equals(employee.getManagerKeycloakId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Employee is outside supervisor scope");
        }
        return toResponse(employee);
    }

    @Override
    public EmployeeResponse getCurrentEmployee(String userKeycloakId, String email) {
        return toResponse(findCurrentEmployee(userKeycloakId, email));
    }

    @Override
    @Transactional
    public EmployeeResponse updateCurrentAvailabilityStatus(
            String userKeycloakId,
            String email,
            UpdateMyAvailabilityStatusRequest request
    ) {
        Employee employee = findCurrentEmployee(userKeycloakId, email);
        employee.setAvailabilityStatus(request.availabilityStatus());
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateCurrentProfile(
            String userKeycloakId,
            String email,
            UpdateMyProfileRequest request
    ) {
        Employee employee = findCurrentEmployee(userKeycloakId, email);
        employee.setPhone(clean(request.phone()));
        employee.setAddress(clean(request.address()));
        employee.setBio(clean(request.bio()));
        employee.setProfilePhotoUrl(clean(request.profilePhotoUrl()));
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateCurrentProfilePhoto(
            String userKeycloakId,
            String email,
            MultipartFile file
    ) {
        Employee employee = findCurrentEmployee(userKeycloakId, email);
        try {
            employee.setProfilePhotoUrl(profilePhotoStorageService.store(file));
        } catch (java.io.IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store profile photo");
        }
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse createEmployee(CreateEmployeeRequest request) {
        if (hasText(request.userKeycloakId()) && employeeRepository.existsByUserKeycloakId(request.userKeycloakId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee already exists for userKeycloakId");
        }
        if (hasText(request.email()) && employeeRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee already exists for email");
        }

        Employee employee = new Employee(
                clean(request.userKeycloakId()),
                clean(request.fullName()),
                clean(request.email()),
                clean(request.jobTitle()),
                clean(request.department()),
                cleanAllowedBannette(request.bannette()),
                clean(request.operationalStatus()),
                clean(request.activityStatus()),
                clean(request.managerKeycloakId()),
                null,
                clean(request.address()),
                null,
                null,
                request.latitude(),
                request.longitude(),
                request.status() == null ? null : request.status()
        );
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateEmployee(Long id, UpdateEmployeeRequest request) {
        Employee employee = findEmployeeById(id);
        if (hasText(request.email())) {
            employeeRepository.findByEmail(request.email())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee already exists for email");
                    });
        }

        employee.setFullName(clean(request.fullName()));
        employee.setEmail(clean(request.email()));
        employee.setJobTitle(clean(request.jobTitle()));
        employee.setDepartment(clean(request.department()));
        employee.setBannette(cleanAllowedBannette(request.bannette()));
        employee.setOperationalStatus(clean(request.operationalStatus()));
        employee.setActivityStatus(clean(request.activityStatus()));
        employee.setManagerKeycloakId(clean(request.managerKeycloakId()));
        employee.setAddress(clean(request.address()));
        employee.setLatitude(request.latitude());
        employee.setLongitude(request.longitude());
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateEmployeeStatus(Long id, UpdateEmployeeStatusRequest request) {
        Employee employee = findEmployeeById(id);
        employee.setStatus(request.status());
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateEmployeeAvailabilityStatus(Long id, UpdateMyAvailabilityStatusRequest request) {
        Employee employee = findEmployeeById(id);
        employee.setAvailabilityStatus(request.availabilityStatus());
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateEmployeeBannette(
            Long id,
            UpdateEmployeeBannetteRequest request,
            String requesterKeycloakId,
            boolean globalAccess
    ) {
        Employee employee = findEmployeeById(id);
        if (!globalAccess && !requesterKeycloakId.equals(employee.getManagerKeycloakId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Employee is outside supervisor scope");
        }
        employee.setBannette(cleanAllowedBannette(request.bannette()));
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateEmployeeDepartment(Long id, UpdateEmployeeDepartmentRequest request) {
        Employee employee = findEmployeeById(id);
        String departmentName = departmentRepository.findById(request.departmentId())
                .filter(com.cgi.intranet.employee.entity.Department::isActive)
                .map(com.cgi.intranet.employee.entity.Department::getName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Active department not found"));
        employee.setDepartment(departmentName);
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse linkEmployeeUser(Long id, LinkEmployeeUserRequest request) {
        Employee employee = findEmployeeById(id);
        String userKeycloakId = clean(request.userKeycloakId());
        String email = clean(request.email());

        if (hasText(userKeycloakId)) {
            employeeRepository.findByUserKeycloakId(userKeycloakId)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee already linked to userKeycloakId");
                    });
        }
        if (hasText(email)) {
            employeeRepository.findByEmail(email)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee already uses email");
                    });
        }

        employee.setUserKeycloakId(userKeycloakId);
        employee.setEmail(email);
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeResponse updateEmployeeManager(Long id, UpdateEmployeeManagerRequest request) {
        Employee employee = findEmployeeById(id);
        employee.setManagerKeycloakId(clean(request.managerKeycloakId()));
        return toResponse(employeeRepository.save(employee));
    }

    @Override
    public EmployeeImportPreviewResponse previewImport(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excel file is required");
        }

        Map<String, EmployeeImportPreviewItem> deduplicated = new LinkedHashMap<>();
        DataFormatter formatter = new DataFormatter(Locale.FRANCE);
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            for (Sheet sheet : workbook) {
                extractEmployeesFromSheet(sheet, formatter, deduplicated);
            }
        }

        List<EmployeeImportPreviewItem> employees = new ArrayList<>(deduplicated.values());
        return new EmployeeImportPreviewResponse(employees.size(), employees);
    }

    @Override
    @Transactional
    public List<EmployeeResponse> confirmImport(ConfirmEmployeeImportRequest request) {
        return request.employees().stream()
                .map(item -> upsertImportedEmployee(item))
                .map(this::toResponse)
                .toList();
    }

    private Employee findEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
    }

    private EmployeeResponse toResponse(Employee employee) {
        return new EmployeeResponse(
                employee.getId(),
                employee.getUserKeycloakId(),
                employee.getFullName(),
                employee.getEmail(),
                employee.getJobTitle(),
                employee.getDepartment(),
                employee.getBannette(),
                employee.getOperationalStatus(),
                employee.getActivityStatus(),
                employee.getManagerKeycloakId(),
                employee.getPhone(),
                employee.getAddress(),
                employee.getBio(),
                employee.getProfilePhotoUrl(),
                employee.getLatitude(),
                employee.getLongitude(),
                employee.getStatus(),
                employee.getAvailabilityStatus() == null
                        ? com.cgi.intranet.employee.enums.AvailabilityStatus.OFFLINE
                        : employee.getAvailabilityStatus(),
                employee.getCreatedAt(),
                employee.getUpdatedAt()
        );
    }

    private Employee findCurrentEmployee(String userKeycloakId, String email) {
        return employeeRepository.findByUserKeycloakId(userKeycloakId)
                .or(() -> email == null || email.isBlank()
                        ? java.util.Optional.empty()
                        : employeeRepository.findByEmail(email))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Employee profile not found for current user"
                ));
    }

    private Employee upsertImportedEmployee(EmployeeImportPreviewItem item) {
        String fullName = clean(item.fullName());
        if (!hasText(fullName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Imported employee fullName is required");
        }

        Employee employee = hasText(item.userKeycloakId())
                ? employeeRepository.findByUserKeycloakId(item.userKeycloakId()).orElse(null)
                : null;
        if (employee == null && hasText(item.email())) {
            employee = employeeRepository.findByEmail(item.email()).orElse(null);
        }
        if (employee == null) {
            employee = employeeRepository.findByFullNameIgnoreCase(fullName).orElse(null);
        }
        if (employee == null) {
            employee = new Employee(
                    null,
                    fullName,
                    clean(item.email()),
                    null,
                    clean(item.department()),
                    cleanAllowedBannette(item.bannette()),
                    clean(item.operationalStatus()),
                    clean(item.activityStatus()),
                    clean(item.managerKeycloakId()),
                    null,
                    clean(item.address()),
                    null,
                    null,
                    item.latitude(),
                    item.longitude(),
                    null
            );
        } else {
            employee.setFullName(fullName);
            employee.setDepartment(clean(item.department()));
            employee.setBannette(cleanAllowedBannette(item.bannette()));
            employee.setOperationalStatus(clean(item.operationalStatus()));
            employee.setActivityStatus(clean(item.activityStatus()));
        }
        return employeeRepository.save(employee);
    }

    private void extractEmployeesFromSheet(
            Sheet sheet,
            DataFormatter formatter,
            Map<String, EmployeeImportPreviewItem> deduplicated
    ) {
        String currentBannette = normalizeBannette(sheet.getSheetName());
        String department = "DS Magasin";

        for (Row row : sheet) {
            List<String> values = rowValues(row, formatter);
            String first = values.isEmpty() ? "" : clean(values.get(0));
            if (!hasText(first)) {
                continue;
            }

            String bannette = detectBannette(values);
            if (bannette != null) {
                currentBannette = bannette;
                continue;
            }

            if (currentBannette == null || shouldSkipImportRow(values)) {
                continue;
            }

            for (String value : values) {
                String name = clean(value);
                if (looksLikeAgentName(name)) {
                    String key = normalizeKey(name);
                    deduplicated.putIfAbsent(key, new EmployeeImportPreviewItem(
                            normalizeName(name),
                            department,
                            currentBannette,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null
                    ));
                }
            }
        }
    }

    private List<String> rowValues(Row row, DataFormatter formatter) {
        List<String> values = new ArrayList<>();
        for (Cell cell : row) {
            if (cell.getCellType() == CellType.BLANK) {
                continue;
            }
            String value = clean(formatter.formatCellValue(cell));
            if (value != null) {
                values.add(value);
            }
        }
        return values;
    }

    private String detectBannette(List<String> values) {
        for (String value : values) {
            String normalized = normalizeKey(value);
            for (String candidate : BANNETTES) {
                if (normalized.equals(normalizeKey(candidate))
                        || normalized.equals(normalizeKey("Magasin " + candidate))
                        || normalized.contains(normalizeKey(candidate))) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private String normalizeBannette(String value) {
        String normalized = normalizeKey(value);
        for (String candidate : BANNETTES) {
            if (normalized.contains(normalizeKey(candidate))) {
                return candidate;
            }
        }
        return null;
    }

    private boolean shouldSkipImportRow(List<String> values) {
        String joined = normalizeKey(String.join(" ", values));
        if (joined.isBlank()) {
            return true;
        }
        if (values.stream().allMatch(value -> value.isBlank() || value.matches("[-+]?\\d+(\\.\\d+)?%?"))) {
            return true;
        }
        return SKIP_TOKENS.stream().anyMatch(joined::contains);
    }

    private boolean looksLikeAgentName(String value) {
        if (!hasText(value) || value.length() < 4 || value.length() > 80) {
            return false;
        }
        if (value.matches(".*\\d.*") || value.contains("%")) {
            return false;
        }
        String normalized = normalizeKey(value);
        if (SKIP_TOKENS.stream().anyMatch(normalized::contains)) {
            return false;
        }
        return value.trim().split("\\s+").length >= 2;
    }

    private String normalizeName(String value) {
        return clean(value).replaceAll("\\s+", " ");
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT)
                .replace('&', ' ')
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String cleanAllowedBannette(String value) {
        String bannette = clean(value);
        if (bannette == null) {
            return null;
        }
        if (!BANNETTES.contains(bannette)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid bannette assignment");
        }
        return bannette;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static final Set<String> BANNETTES = Set.of(
            "FO",
            "BO",
            "PROXI-PMC",
            "Partenaire",
            "Supply",
            "DS-Magasin"
    );

    private static final Set<String> SKIP_TOKENS = Set.of(
            "agent",
            "total",
            "appels",
            "repondus",
            "perdus",
            "abandonnes",
            "qs",
            "nps",
            "sla",
            "taux",
            "duree",
            "moy",
            "conformite",
            "decembre",
            "novembre",
            "semaine",
            "graphes",
            "qualite",
            "autonomie",
            "transverse",
            "production",
            "comptabilises"
    );
}
