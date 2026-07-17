package com.cgi.intranet.employee.excelimport;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ImportDryRunModels {

    private ImportDryRunModels() {
    }

    public enum DuplicateClassification {
        UNIQUE,
        DUPLICATE_IN_WORKBOOK,
        DUPLICATE_ACROSS_WORKBOOKS,
        POSSIBLE_EXISTING_DATABASE_MATCH,
        AMBIGUOUS
    }

    public enum PlanningCandidateType {
        SHIFT,
        REST_DAY,
        ABSENCE,
        LEAVE
    }

    public enum PlanningIdentityStatus {
        MATCHED_EMPLOYEE,
        POSSIBLE_MATCH,
        EMPLOYEE_NOT_FOUND,
        AMBIGUOUS_MATCH
    }

    public enum ReviewClassification {
        RECOGNIZED,
        IGNORED,
        REVIEW_REQUIRED,
        INVALID
    }

    public record ImportSourceReference(
            String sourceFile,
            String sourceSheet,
            int sourceRow,
            String sourceColumn,
            String originalExternalReference
    ) {
    }

    public record ImportValidationError(
            String code,
            String field,
            String message,
            String maskedValue,
            ImportSourceReference source
    ) {
    }

    public record ImportValidationWarning(
            String code,
            String field,
            String message,
            String maskedValue,
            ImportSourceReference source
    ) {
    }

    public record BannetteManagerCandidate(
            String normalizedBannette,
            String managerFullName,
            DuplicateClassification duplicateClassification,
            ImportSourceReference source
    ) {
    }

    public record EmployeeImportCandidate(
            String normalizedFullName,
            String firstName,
            String lastName,
            String professionalEmail,
            String normalizedUsernameProposal,
            String userKeycloakId,
            String bannette,
            String expectedRole,
            DuplicateClassification duplicateClassification,
            ImportSourceReference source
    ) {
    }

    public record TicketImportCandidate(
            String externalReference,
            String title,
            String description,
            String solution,
            String status,
            String priority,
            String slaStatus,
            String bannette,
            String requesterEmail,
            String resolverName,
            LocalDateTime createdAt,
            LocalDateTime resolvedAt,
            Double ttrHours,
            Double targetHours,
            DuplicateClassification duplicateClassification,
            ImportSourceReference source
    ) {
    }

    public record PlanningImportCandidate(
            String employeeName,
            String bannette,
            LocalDate planningDate,
            PlanningCandidateType type,
            LocalTime startTime,
            LocalTime endTime,
            String rawValue,
            PlanningIdentityStatus identityStatus,
            DuplicateClassification duplicateClassification,
            ImportSourceReference source
    ) {
    }

    public record HistoricalKpiCandidate(
            String employeeName,
            String period,
            String indicatorName,
            String displayedValue,
            boolean formulaCell,
            String formulaText,
            ImportSourceReference source
    ) {
    }

    public record PlanningUnknownValueReview(
            String normalizedValue,
            String originalExample,
            int occurrenceCount,
            String sourceSheets,
            String exampleRows,
            ReviewClassification proposedClassification
    ) {
    }

    public record PlanningSheetLayoutReport(
            String sheet,
            String detectedHeaderRows,
            String employeeNameColumn,
            String firstPlanningColumn,
            String lastPlanningColumn,
            int detectedDateCount,
            int detectedEmployeeRowCount,
            int ignoredRowCount,
            int ambiguousRowCount
    ) {
    }

    public record TicketSheetLayoutReport(
            String workbook,
            String sheet,
            int detectedHeaderRow,
            String identifierColumn,
            String titleColumn,
            String statusColumn,
            String priorityColumn,
            String creationDateColumn,
            String resolutionDateColumn,
            int acceptedRows,
            int ignoredRows,
            int ambiguousRows
    ) {
    }

    public record UnknownEnumReview(
            String enumDomain,
            String originalValue,
            String normalizedValue,
            int occurrenceCount,
            String workbook,
            String sheet,
            String detectedHeader,
            int exampleRow,
            String proposedTargetField,
            String proposedMapping,
            String confidence
    ) {
    }

    public record InvalidDateReview(
            String workbook,
            String sheet,
            String field,
            String originalValue,
            String cellType,
            int occurrenceCount,
            String exampleRows,
            String likelyCause
    ) {
    }

    public record BannetteManagerConflictReview(
            String normalizedBannette,
            String managerName,
            int occurrenceCount,
            String sourceFile,
            String sourceSheet,
            String exampleRows,
            String conflictGroupId
    ) {
    }

    public record ConsolidatedEmployeeCandidate(
            String canonicalCandidateId,
            String normalizedFullName,
            String professionalEmail,
            String employeeNumber,
            String bannette,
            String expectedRole,
            int occurrenceCount,
            String sourceFiles,
            String sourceSheets,
            String identityMatchStatus,
            String conflictFlags
    ) {
    }

    public record HistoricalKpiSummary(
            String employeeName,
            String period,
            String indicatorName,
            String evaluatedValue,
            boolean formulaFlag,
            String sourceSheet,
            int occurrenceCount
    ) {
    }

    public record SheetDryRunReport(
            String sourceFile,
            String sourceSheet,
            int rowsRead,
            int candidates,
            int warnings,
            int errors
    ) {
    }

    public static final class ImportDryRunReport {
        private final List<String> processedFiles = new ArrayList<>();
        private final List<String> excludedFiles = new ArrayList<>();
        private final List<SheetDryRunReport> sheets = new ArrayList<>();
        private final List<BannetteManagerCandidate> bannetteMappings = new ArrayList<>();
        private final List<EmployeeImportCandidate> employees = new ArrayList<>();
        private final List<TicketImportCandidate> tickets = new ArrayList<>();
        private final List<PlanningImportCandidate> plannings = new ArrayList<>();
        private final List<HistoricalKpiCandidate> historicalKpis = new ArrayList<>();
        private final List<ImportValidationError> errors = new ArrayList<>();
        private final List<ImportValidationWarning> warnings = new ArrayList<>();
        private final Map<String, Integer> duplicateStatistics = new LinkedHashMap<>();
        private final Map<String, Integer> unknownEnumValues = new LinkedHashMap<>();
        private final Map<String, PlanningUnknownAccumulator> planningUnknownValues = new LinkedHashMap<>();
        private final List<PlanningSheetLayoutReport> planningSheetLayouts = new ArrayList<>();
        private final List<TicketSheetLayoutReport> ticketSheetLayouts = new ArrayList<>();
        private final Map<String, UnknownEnumAccumulator> unknownEnumReviews = new LinkedHashMap<>();
        private final Map<String, InvalidDateAccumulator> invalidDateReviews = new LinkedHashMap<>();
        private final Map<String, BannetteManagerConflictAccumulator> bannetteManagerConflicts = new LinkedHashMap<>();
        private final Map<String, Integer> ignoredStatistics = new LinkedHashMap<>();
        private final Map<String, Integer> reviewRequiredStatistics = new LinkedHashMap<>();

        public List<String> getProcessedFiles() {
            return processedFiles;
        }

        public List<String> getExcludedFiles() {
            return excludedFiles;
        }

        public List<SheetDryRunReport> getSheets() {
            return sheets;
        }

        public List<BannetteManagerCandidate> getBannetteMappings() {
            return bannetteMappings;
        }

        public List<EmployeeImportCandidate> getEmployees() {
            return employees;
        }

        public List<TicketImportCandidate> getTickets() {
            return tickets;
        }

        public List<PlanningImportCandidate> getPlannings() {
            return plannings;
        }

        public List<HistoricalKpiCandidate> getHistoricalKpis() {
            return historicalKpis;
        }

        public List<ImportValidationError> getErrors() {
            return errors;
        }

        public List<ImportValidationWarning> getWarnings() {
            return warnings;
        }

        public Map<String, Integer> getDuplicateStatistics() {
            return duplicateStatistics;
        }

        public Map<String, Integer> getUnknownEnumValues() {
            return unknownEnumValues;
        }

        public Map<String, PlanningUnknownAccumulator> getPlanningUnknownValues() {
            return planningUnknownValues;
        }

        public List<PlanningSheetLayoutReport> getPlanningSheetLayouts() {
            return planningSheetLayouts;
        }

        public List<TicketSheetLayoutReport> getTicketSheetLayouts() {
            return ticketSheetLayouts;
        }

        public Map<String, UnknownEnumAccumulator> getUnknownEnumReviews() {
            return unknownEnumReviews;
        }

        public Map<String, InvalidDateAccumulator> getInvalidDateReviews() {
            return invalidDateReviews;
        }

        public Map<String, BannetteManagerConflictAccumulator> getBannetteManagerConflicts() {
            return bannetteManagerConflicts;
        }

        public Map<String, Integer> getIgnoredStatistics() {
            return ignoredStatistics;
        }

        public Map<String, Integer> getReviewRequiredStatistics() {
            return reviewRequiredStatistics;
        }

        public Map<String, Object> summary() {
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("processedFiles", processedFiles);
            summary.put("excludedFiles", excludedFiles);
            summary.put("sheetCount", sheets.size());
            summary.put("bannetteMappings", bannetteMappings.size());
            summary.put("employeeCandidates", employees.size());
            summary.put("ticketCandidates", tickets.size());
            summary.put("planningCandidates", plannings.size());
            summary.put("historicalKpiReferences", historicalKpis.size());
            summary.put("warnings", warnings.size());
            summary.put("errors", errors.size());
            summary.put("duplicateStatistics", duplicateStatistics);
            summary.put("unknownEnumValues", unknownEnumValues);
            summary.put("ignoredStatistics", ignoredStatistics);
            summary.put("reviewRequiredStatistics", reviewRequiredStatistics);
            summary.put("groups", groupedSummary());
            return summary;
        }

        private Map<String, Object> groupedSummary() {
            Map<String, Object> groups = new LinkedHashMap<>();
            groups.put("employees", group(
                    employees.size(),
                    consolidatedEmployeeCandidates().size(),
                    consolidatedEmployeeCandidates().size(),
                    countDuplicate("employee"),
                    ignoredStatistics.getOrDefault("employee", 0),
                    reviewRequiredStatistics.getOrDefault("employee", 0),
                    countErrors("fullName")
            ));
            groups.put("bannettes", group(
                    bannetteMappings.size(),
                    bannetteMappings.size(),
                    (int) bannetteMappings.stream().map(BannetteManagerCandidate::normalizedBannette).distinct().count(),
                    countDuplicate("bannette"),
                    ignoredStatistics.getOrDefault("bannette", 0),
                    reviewRequiredStatistics.getOrDefault("bannette", 0),
                    countErrors("bannette")
            ));
            groups.put("tickets", group(
                    tickets.size(),
                    tickets.size(),
                    (int) tickets.stream().map(TicketImportCandidate::externalReference).filter(value -> value != null && !value.isBlank()).distinct().count(),
                    countDuplicate("ticket"),
                    ignoredStatistics.getOrDefault("ticket", 0),
                    reviewRequiredStatistics.getOrDefault("ticket", 0),
                    countErrors("externalReference") + countErrors("title")
            ));
            groups.put("planning", group(
                    plannings.size(),
                    plannings.size(),
                    (int) plannings.stream().map(candidate -> candidate.employeeName() + "|" + candidate.planningDate() + "|" + candidate.rawValue()).distinct().count(),
                    countDuplicate("planning"),
                    ignoredStatistics.getOrDefault("planning", 0),
                    reviewRequiredStatistics.getOrDefault("planning", 0),
                    countErrors("shift")
            ));
            groups.put("historicalKpi", group(
                    historicalKpis.size(),
                    historicalKpiSummaries().size(),
                    historicalKpiSummaries().size(),
                    countDuplicate("historicalKpi"),
                    ignoredStatistics.getOrDefault("historicalKpi", 0),
                    reviewRequiredStatistics.getOrDefault("historicalKpi", 0),
                    countErrors("historicalKpi")
            ));
            return groups;
        }

        private Map<String, Integer> group(int rawOccurrences, int normalizedCandidates, int uniqueCandidates, int duplicateOccurrences, int ignored, int reviewRequired, int errors) {
            Map<String, Integer> group = new LinkedHashMap<>();
            group.put("rawOccurrences", rawOccurrences);
            group.put("normalizedCandidates", normalizedCandidates);
            group.put("uniqueCandidates", uniqueCandidates);
            group.put("duplicateOccurrences", duplicateOccurrences);
            group.put("ignored", ignored);
            group.put("reviewRequired", reviewRequired);
            group.put("errors", errors);
            return group;
        }

        private int countErrors(String field) {
            return (int) errors.stream().filter(error -> field.equals(error.field())).count();
        }

        private int countDuplicate(String scope) {
            return duplicateStatistics.entrySet().stream()
                    .filter(entry -> entry.getKey().startsWith(scope + ":") && !entry.getKey().endsWith(":UNIQUE"))
                    .mapToInt(Map.Entry::getValue)
                    .sum();
        }

        public List<PlanningUnknownValueReview> planningUnknownReviews() {
            return planningUnknownValues.values().stream()
                    .map(PlanningUnknownAccumulator::toReview)
                    .sorted((left, right) -> {
                        int count = Integer.compare(right.occurrenceCount(), left.occurrenceCount());
                        return count != 0 ? count : left.normalizedValue().compareTo(right.normalizedValue());
                    })
                    .toList();
        }

        public List<UnknownEnumReview> unknownEnumReviewRows() {
            return unknownEnumReviews.values().stream()
                    .map(UnknownEnumAccumulator::toReview)
                    .sorted((left, right) -> {
                        int domain = left.enumDomain().compareTo(right.enumDomain());
                        return domain != 0 ? domain : left.normalizedValue().compareTo(right.normalizedValue());
                    })
                    .toList();
        }

        public List<InvalidDateReview> invalidDateReviewRows() {
            return invalidDateReviews.values().stream()
                    .map(InvalidDateAccumulator::toReview)
                    .sorted((left, right) -> {
                        int workbook = left.workbook().compareTo(right.workbook());
                        if (workbook != 0) return workbook;
                        int sheet = left.sheet().compareTo(right.sheet());
                        if (sheet != 0) return sheet;
                        return left.field().compareTo(right.field());
                    })
                    .toList();
        }

        public List<BannetteManagerConflictReview> bannetteManagerConflictRows() {
            return bannetteManagerConflicts.values().stream()
                    .map(BannetteManagerConflictAccumulator::toReview)
                    .sorted((left, right) -> {
                        int bannette = left.normalizedBannette().compareTo(right.normalizedBannette());
                        return bannette != 0 ? bannette : left.managerName().compareTo(right.managerName());
                    })
                    .toList();
        }

        public List<ConsolidatedEmployeeCandidate> consolidatedEmployeeCandidates() {
            Map<String, EmployeeConsolidationAccumulator> byIdentity = new LinkedHashMap<>();
            for (EmployeeImportCandidate employee : employees) {
                String key = employee.professionalEmail() != null
                        ? "email:" + employee.professionalEmail().toLowerCase()
                        : "name-bannette:" + safeKey(employee.normalizedFullName()) + "|" + safeKey(employee.bannette());
                byIdentity.computeIfAbsent(key, ignored -> new EmployeeConsolidationAccumulator(key)).add(employee);
            }
            return byIdentity.values().stream()
                    .map(EmployeeConsolidationAccumulator::toCandidate)
                    .sorted((left, right) -> left.canonicalCandidateId().compareTo(right.canonicalCandidateId()))
                    .toList();
        }

        public List<HistoricalKpiSummary> historicalKpiSummaries() {
            Map<String, HistoricalKpiSummaryAccumulator> byKey = new LinkedHashMap<>();
            for (HistoricalKpiCandidate kpi : historicalKpis) {
                String key = safeKey(kpi.employeeName()) + "|" + safeKey(kpi.period()) + "|" + safeKey(kpi.indicatorName()) + "|" + safeKey(kpi.source().sourceSheet());
                byKey.computeIfAbsent(key, ignored -> new HistoricalKpiSummaryAccumulator(kpi)).add(kpi);
            }
            return byKey.values().stream()
                    .map(HistoricalKpiSummaryAccumulator::toSummary)
                    .sorted((left, right) -> {
                        int employee = left.employeeName().compareTo(right.employeeName());
                        if (employee != 0) return employee;
                        int period = left.period().compareTo(right.period());
                        if (period != 0) return period;
                        return left.indicatorName().compareTo(right.indicatorName());
                    })
                    .toList();
        }

        private String safeKey(String value) {
            return value == null ? "" : value.trim().toLowerCase();
        }
    }

    public static final class PlanningUnknownAccumulator {
        private final String normalizedValue;
        private final String originalExample;
        private final java.util.Set<String> sheets = new java.util.TreeSet<>();
        private final java.util.Set<String> exampleRows = new java.util.TreeSet<>();
        private int count;

        public PlanningUnknownAccumulator(String normalizedValue, String originalExample) {
            this.normalizedValue = normalizedValue;
            this.originalExample = originalExample;
        }

        public void add(String sheet, int row) {
            count++;
            sheets.add(sheet);
            if (exampleRows.size() < 12) {
                exampleRows.add(String.valueOf(row));
            }
        }

        PlanningUnknownValueReview toReview() {
            return new PlanningUnknownValueReview(normalizedValue, originalExample, count, String.join("|", sheets), String.join("|", exampleRows), ReviewClassification.REVIEW_REQUIRED);
        }
    }

    public static final class UnknownEnumAccumulator {
        private final String enumDomain;
        private final String originalValue;
        private final String normalizedValue;
        private final String workbook;
        private final String sheet;
        private final String detectedHeader;
        private final int exampleRow;
        private final String proposedTargetField;
        private final String proposedMapping;
        private final String confidence;
        private int count;

        public UnknownEnumAccumulator(String enumDomain, String originalValue, String normalizedValue, ImportSourceReference source, String proposedTargetField) {
            this.enumDomain = enumDomain;
            this.originalValue = originalValue;
            this.normalizedValue = normalizedValue;
            this.workbook = source.sourceFile();
            this.sheet = source.sourceSheet();
            this.detectedHeader = source.sourceColumn();
            this.exampleRow = source.sourceRow();
            this.proposedTargetField = proposedTargetField;
            this.proposedMapping = "";
            this.confidence = "REVIEW";
        }

        public void increment() {
            count++;
        }

        UnknownEnumReview toReview() {
            return new UnknownEnumReview(enumDomain, originalValue, normalizedValue, count, workbook, sheet, detectedHeader, exampleRow, proposedTargetField, proposedMapping, confidence);
        }
    }

    public static final class InvalidDateAccumulator {
        private final String workbook;
        private final String sheet;
        private final String field;
        private final String originalValue;
        private final String cellType;
        private final java.util.Set<String> exampleRows = new java.util.TreeSet<>();
        private final String likelyCause;
        private int count;

        public InvalidDateAccumulator(String workbook, String sheet, String field, String originalValue, String cellType, String likelyCause) {
            this.workbook = workbook;
            this.sheet = sheet;
            this.field = field;
            this.originalValue = originalValue;
            this.cellType = cellType;
            this.likelyCause = likelyCause;
        }

        public void add(int row) {
            count++;
            if (exampleRows.size() < 12) {
                exampleRows.add(String.valueOf(row));
            }
        }

        InvalidDateReview toReview() {
            return new InvalidDateReview(workbook, sheet, field, originalValue, cellType, count, String.join("|", exampleRows), likelyCause);
        }
    }

    public static final class BannetteManagerConflictAccumulator {
        private final String normalizedBannette;
        private final String managerName;
        private final String sourceFile;
        private final String sourceSheet;
        private final String conflictGroupId;
        private final java.util.Set<String> exampleRows = new java.util.TreeSet<>();
        private int count;

        public BannetteManagerConflictAccumulator(String normalizedBannette, String managerName, ImportSourceReference source, String conflictGroupId) {
            this.normalizedBannette = normalizedBannette;
            this.managerName = managerName;
            this.sourceFile = source.sourceFile();
            this.sourceSheet = source.sourceSheet();
            this.conflictGroupId = conflictGroupId;
        }

        public void add(int row) {
            count++;
            if (exampleRows.size() < 12) {
                exampleRows.add(String.valueOf(row));
            }
        }

        BannetteManagerConflictReview toReview() {
            return new BannetteManagerConflictReview(normalizedBannette, managerName, count, sourceFile, sourceSheet, String.join("|", exampleRows), conflictGroupId);
        }
    }

    private static final class EmployeeConsolidationAccumulator {
        private final String key;
        private final java.util.Set<String> names = new java.util.TreeSet<>();
        private final java.util.Set<String> emails = new java.util.TreeSet<>();
        private final java.util.Set<String> bannettes = new java.util.TreeSet<>();
        private final java.util.Set<String> roles = new java.util.TreeSet<>();
        private final java.util.Set<String> files = new java.util.TreeSet<>();
        private final java.util.Set<String> sheets = new java.util.TreeSet<>();
        private int count;

        private EmployeeConsolidationAccumulator(String key) {
            this.key = key;
        }

        private void add(EmployeeImportCandidate employee) {
            count++;
            if (employee.normalizedFullName() != null) names.add(employee.normalizedFullName());
            if (employee.professionalEmail() != null) emails.add(employee.professionalEmail());
            if (employee.bannette() != null) bannettes.add(employee.bannette());
            if (employee.expectedRole() != null) roles.add(employee.expectedRole());
            files.add(employee.source().sourceFile());
            sheets.add(employee.source().sourceSheet());
        }

        private ConsolidatedEmployeeCandidate toCandidate() {
            String status = emails.isEmpty() ? (bannettes.size() <= 1 ? "MATCHED_BY_NAME_AND_BANNETTE" : "CONFLICTING_BANNETTE") : "MATCHED_BY_EMAIL";
            String conflicts = bannettes.size() > 1 ? "CONFLICTING_BANNETTE" : "";
            return new ConsolidatedEmployeeCandidate(
                    key.replace(":", "-").replace("|", "-"),
                    names.stream().findFirst().orElse(""),
                    emails.stream().findFirst().orElse(""),
                    "",
                    String.join("|", bannettes),
                    roles.contains("MANAGER") ? "MANAGER" : roles.stream().findFirst().orElse("EMPLOYEE"),
                    count,
                    String.join("|", files),
                    String.join("|", sheets),
                    status,
                    conflicts
            );
        }
    }

    private static final class HistoricalKpiSummaryAccumulator {
        private final HistoricalKpiCandidate first;
        private boolean formula;
        private int count;

        private HistoricalKpiSummaryAccumulator(HistoricalKpiCandidate first) {
            this.first = first;
        }

        private void add(HistoricalKpiCandidate candidate) {
            count++;
            formula = formula || candidate.formulaCell();
        }

        private HistoricalKpiSummary toSummary() {
            return new HistoricalKpiSummary(
                    first.employeeName(),
                    first.period(),
                    first.indicatorName(),
                    first.displayedValue(),
                    formula,
                    first.source().sourceSheet(),
                    count
            );
        }
    }
}
