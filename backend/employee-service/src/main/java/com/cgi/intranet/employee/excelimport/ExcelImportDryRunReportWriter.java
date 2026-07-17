package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.BannetteManagerCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.EmployeeImportCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.HistoricalKpiCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportDryRunReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportValidationError;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportValidationWarning;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.PlanningImportCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.TicketImportCandidate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

@Component
public class ExcelImportDryRunReportWriter {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
    private final ExcelImportNormalizer normalizer = new ExcelImportNormalizer();

    public void write(ImportDryRunReport report, Path outputDirectory) throws IOException {
        Files.createDirectories(outputDirectory);
        objectMapper.writeValue(outputDirectory.resolve("summary.json").toFile(), report.summary());
        objectMapper.writeValue(outputDirectory.resolve("workbook-report.json").toFile(), report);
        writeCsv(outputDirectory.resolve("validation-errors.csv"), List.of(
                "code", "field", "message", "maskedValue", "sourceFile", "sourceSheet", "sourceRow", "sourceColumn"
        ), report.getErrors(), this::errorRow);
        writeCsv(outputDirectory.resolve("validation-warnings.csv"), List.of(
                "code", "field", "message", "maskedValue", "sourceFile", "sourceSheet", "sourceRow", "sourceColumn"
        ), report.getWarnings(), this::warningRow);
        writeCsv(outputDirectory.resolve("normalized-employee-candidates.csv"), List.of(
                "fullName", "firstName", "lastName", "emailMasked", "usernameProposal", "userKeycloakId", "bannette", "expectedRole", "duplicate", "sourceFile", "sourceSheet", "sourceRow"
        ), report.getEmployees(), this::employeeRow);
        writeCsv(outputDirectory.resolve("normalized-bannette-mappings.csv"), List.of(
                "bannette", "managerFullName", "duplicate", "sourceFile", "sourceSheet", "sourceRow"
        ), report.getBannetteMappings(), this::bannetteRow);
        writeCsv(outputDirectory.resolve("normalized-ticket-candidates.csv"), List.of(
                "externalReference", "title", "status", "priority", "slaStatus", "bannette", "requesterEmailMasked", "resolverName", "createdAt", "resolvedAt", "ttrHours", "targetHours", "duplicate", "sourceFile", "sourceSheet", "sourceRow"
        ), report.getTickets(), this::ticketRow);
        writeCsv(outputDirectory.resolve("normalized-planning-candidates.csv"), List.of(
                "employeeName", "bannette", "date", "type", "startTime", "endTime", "rawValue", "identityStatus", "duplicate", "sourceFile", "sourceSheet", "sourceRow", "sourceColumn"
        ), report.getPlannings(), this::planningRow);
        writeCsv(outputDirectory.resolve("historical-kpi-reference.csv"), List.of(
                "employeeName", "period", "indicatorName", "displayedValue", "formulaCell", "formulaText", "sourceFile", "sourceSheet", "sourceRow", "sourceColumn"
        ), report.getHistoricalKpis(), this::kpiRow);
    }

    private List<String> errorRow(ImportValidationError error) {
        return List.of(
                value(error.code()),
                value(error.field()),
                value(error.message()),
                value(error.maskedValue()),
                value(error.source().sourceFile()),
                value(error.source().sourceSheet()),
                String.valueOf(error.source().sourceRow()),
                value(error.source().sourceColumn())
        );
    }

    private List<String> warningRow(ImportValidationWarning warning) {
        return List.of(
                value(warning.code()),
                value(warning.field()),
                value(warning.message()),
                value(warning.maskedValue()),
                value(warning.source().sourceFile()),
                value(warning.source().sourceSheet()),
                String.valueOf(warning.source().sourceRow()),
                value(warning.source().sourceColumn())
        );
    }

    private List<String> employeeRow(EmployeeImportCandidate candidate) {
        return List.of(
                value(candidate.normalizedFullName()),
                value(candidate.firstName()),
                value(candidate.lastName()),
                value(normalizer.maskEmail(candidate.professionalEmail())),
                value(candidate.normalizedUsernameProposal()),
                value(candidate.userKeycloakId()),
                value(candidate.bannette()),
                value(candidate.expectedRole()),
                candidate.duplicateClassification().name(),
                value(candidate.source().sourceFile()),
                value(candidate.source().sourceSheet()),
                String.valueOf(candidate.source().sourceRow())
        );
    }

    private List<String> bannetteRow(BannetteManagerCandidate candidate) {
        return List.of(
                value(candidate.normalizedBannette()),
                value(candidate.managerFullName()),
                candidate.duplicateClassification().name(),
                value(candidate.source().sourceFile()),
                value(candidate.source().sourceSheet()),
                String.valueOf(candidate.source().sourceRow())
        );
    }

    private List<String> ticketRow(TicketImportCandidate candidate) {
        return List.of(
                value(candidate.externalReference()),
                value(candidate.title()),
                value(candidate.status()),
                value(candidate.priority()),
                value(candidate.slaStatus()),
                value(candidate.bannette()),
                value(normalizer.maskEmail(candidate.requesterEmail())),
                value(candidate.resolverName()),
                value(candidate.createdAt()),
                value(candidate.resolvedAt()),
                value(candidate.ttrHours()),
                value(candidate.targetHours()),
                candidate.duplicateClassification().name(),
                value(candidate.source().sourceFile()),
                value(candidate.source().sourceSheet()),
                String.valueOf(candidate.source().sourceRow())
        );
    }

    private List<String> planningRow(PlanningImportCandidate candidate) {
        return List.of(
                value(candidate.employeeName()),
                value(candidate.bannette()),
                value(candidate.planningDate()),
                candidate.type().name(),
                value(candidate.startTime()),
                value(candidate.endTime()),
                value(candidate.rawValue()),
                candidate.identityStatus().name(),
                candidate.duplicateClassification().name(),
                value(candidate.source().sourceFile()),
                value(candidate.source().sourceSheet()),
                String.valueOf(candidate.source().sourceRow()),
                value(candidate.source().sourceColumn())
        );
    }

    private List<String> kpiRow(HistoricalKpiCandidate candidate) {
        return List.of(
                value(candidate.employeeName()),
                value(candidate.period()),
                value(candidate.indicatorName()),
                value(candidate.displayedValue()),
                String.valueOf(candidate.formulaCell()),
                value(candidate.formulaText()),
                value(candidate.source().sourceFile()),
                value(candidate.source().sourceSheet()),
                String.valueOf(candidate.source().sourceRow()),
                value(candidate.source().sourceColumn())
        );
    }

    private <T> void writeCsv(Path path, List<String> headers, List<T> rows, Function<T, List<String>> mapper) throws IOException {
        List<String> lines = new ArrayList<>();
        lines.add(toCsv(headers));
        for (T row : rows) {
            lines.add(toCsv(mapper.apply(row)));
        }
        Files.write(path, lines, StandardCharsets.UTF_8);
    }

    private String toCsv(List<String> values) {
        return values.stream().map(this::quote).reduce((left, right) -> left + "," + right).orElse("");
    }

    private String quote(String value) {
        String safe = value == null ? "" : value;
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
