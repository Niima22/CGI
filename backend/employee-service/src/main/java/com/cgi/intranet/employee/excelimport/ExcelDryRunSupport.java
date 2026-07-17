package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.DuplicateClassification;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportDryRunReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportSourceReference;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportValidationError;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportValidationWarning;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.BannetteManagerConflictAccumulator;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.InvalidDateAccumulator;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.PlanningUnknownAccumulator;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.UnknownEnumAccumulator;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

class ExcelDryRunSupport {

    final ExcelImportNormalizer normalizer;
    final ExcelEnumMapper enumMapper;
    final DataFormatter formatter;
    final FormulaEvaluator evaluator;
    final String sourceFile;
    final ImportDryRunReport report;
    final DuplicateClassifier duplicateClassifier;

    ExcelDryRunSupport(
            ExcelImportNormalizer normalizer,
            ExcelEnumMapper enumMapper,
            DataFormatter formatter,
            FormulaEvaluator evaluator,
            String sourceFile,
            ImportDryRunReport report,
            DuplicateClassifier duplicateClassifier
    ) {
        this.normalizer = normalizer;
        this.enumMapper = enumMapper;
        this.formatter = formatter;
        this.evaluator = evaluator;
        this.sourceFile = sourceFile;
        this.report = report;
        this.duplicateClassifier = duplicateClassifier;
    }

    Map<String, Integer> headerMap(Sheet sheet) {
        int rowIndex = detectHeaderRow(sheet);
        Row row = sheet.getRow(rowIndex);
        Map<String, Integer> headers = new LinkedHashMap<>();
        if (row == null) {
            return headers;
        }
        for (Cell cell : row) {
            String value = normalizer.readCell(cell, formatter, evaluator);
            String key = normalizer.normalizeKey(value);
            if (!key.isBlank()) {
                headers.putIfAbsent(key, cell.getColumnIndex());
            }
        }
        return headers;
    }

    int detectHeaderRow(Sheet sheet) {
        int bestRow = Math.max(0, sheet.getFirstRowNum());
        int bestScore = -1;
        for (int r = Math.max(0, sheet.getFirstRowNum()); r <= Math.min(sheet.getLastRowNum(), sheet.getFirstRowNum() + 80); r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            int score = 0;
            for (Cell cell : row) {
                String key = normalizer.normalizeKey(normalizer.readCell(cell, formatter, evaluator));
                if (key.matches(".*(ticket|titre|bannette|bannete|responsable|resolu|agent|date|priorite|statut|adresse|mail).*")) {
                    score += 3;
                } else if (!key.isBlank()) {
                    score++;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestRow = r;
            }
        }
        return bestRow;
    }

    String value(Row row, Map<String, Integer> headers, String... headerAliases) {
        Cell cell = cell(row, headers, headerAliases);
        return normalizer.readCell(cell, formatter, evaluator);
    }

    String reference(Row row, Map<String, Integer> headers, String... headerAliases) {
        Cell cell = cell(row, headers, headerAliases);
        return normalizer.readStableReference(cell, formatter, evaluator);
    }

    Cell cell(Row row, Map<String, Integer> headers, String... headerAliases) {
        if (row == null) {
            return null;
        }
        for (String alias : headerAliases) {
            Integer index = headers.get(normalizer.normalizeKey(alias));
            if (index != null) {
                return row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            }
        }
        return null;
    }

    ImportSourceReference source(Sheet sheet, Row row, String column, String reference) {
        return new ImportSourceReference(
                sourceFile,
                sheet.getSheetName(),
                row == null ? 0 : row.getRowNum() + 1,
                column,
                reference
        );
    }

    void error(String code, String field, String message, String maskedValue, ImportSourceReference source) {
        report.getErrors().add(new ImportValidationError(code, field, message, maskedValue, source));
    }

    void warning(String code, String field, String message, String maskedValue, ImportSourceReference source) {
        report.getWarnings().add(new ImportValidationWarning(code, field, message, maskedValue, source));
    }

    void unknownEnum(String field, String value, ImportSourceReference source) {
        unknownEnum(field, value, source, field);
    }

    void unknownEnum(String field, String value, ImportSourceReference source, String proposedTargetField) {
        if (value == null || value.isBlank()) {
            return;
        }
        String normalized = normalizer.normalizeKey(value);
        report.getUnknownEnumValues().merge(field + ":" + value, 1, Integer::sum);
        String key = field + "|" + normalized + "|" + source.sourceFile() + "|" + source.sourceSheet() + "|" + source.sourceColumn();
        report.getUnknownEnumReviews()
                .computeIfAbsent(key, ignored -> new UnknownEnumAccumulator(field, value, normalized, source, proposedTargetField))
                .increment();
        warning("UNKNOWN_ENUM_VALUE", field, "No safe enum mapping exists for value", value, source);
    }

    void planningUnknown(String value, Sheet sheet, Row row) {
        String normalized = normalizer.normalizeKey(value);
        if (normalized.isBlank()) {
            return;
        }
        String key = sheet.getSheetName() + "|" + normalized;
        report.getPlanningUnknownValues()
                .computeIfAbsent(key, ignored -> new PlanningUnknownAccumulator(normalized, normalizer.cleanText(value)))
                .add(sheet.getSheetName(), row.getRowNum() + 1);
        report.getReviewRequiredStatistics().merge("planning", 1, Integer::sum);
    }

    void invalidDate(String field, Cell cell, Sheet sheet, Row row, String likelyCause) {
        String value = normalizer.readCell(cell, formatter, evaluator);
        if (value == null) {
            return;
        }
        String cellType = cell == null ? "" : effectiveCellType(cell).name();
        String key = sourceFile + "|" + sheet.getSheetName() + "|" + field + "|" + normalizer.normalizeKey(value) + "|" + cellType;
        report.getInvalidDateReviews()
                .computeIfAbsent(key, ignored -> new InvalidDateAccumulator(sourceFile, sheet.getSheetName(), field, value, cellType, likelyCause))
                .add(row.getRowNum() + 1);
    }

    void bannetteConflict(String bannette, String manager, ImportSourceReference source) {
        String group = "BANNETTE-" + normalizer.normalizeKey(bannette).replace(' ', '-');
        String key = normalizer.normalizeKey(bannette) + "|" + normalizer.normalizeKey(manager) + "|" + source.sourceFile() + "|" + source.sourceSheet();
        report.getBannetteManagerConflicts()
                .computeIfAbsent(key, ignored -> new BannetteManagerConflictAccumulator(bannette, manager, source, group))
                .add(source.sourceRow());
        report.getReviewRequiredStatistics().merge("bannette", 1, Integer::sum);
    }

    void ignored(String scope) {
        report.getIgnoredStatistics().merge(scope, 1, Integer::sum);
    }

    private CellType effectiveCellType(Cell cell) {
        if (cell == null) {
            return CellType.BLANK;
        }
        return cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
    }

    boolean blankRow(Row row) {
        if (row == null) {
            return true;
        }
        for (Cell cell : row) {
            if (normalizer.readCell(cell, formatter, evaluator) != null) {
                return false;
            }
        }
        return true;
    }

    DuplicateClassifier duplicates() {
        return duplicateClassifier;
    }

    static class DuplicateClassifier {
        private final ImportDryRunReport report;
        private final Map<String, String> seen = new HashMap<>();

        DuplicateClassifier(ImportDryRunReport report) {
            this.report = report;
        }

        DuplicateClassification classify(String scope, String key, String sourceFile) {
            if (key == null || key.isBlank()) {
                return DuplicateClassification.AMBIGUOUS;
            }
            String fullKey = scope + ":" + key;
            String previousFile = seen.putIfAbsent(fullKey, sourceFile);
            DuplicateClassification result;
            if (previousFile == null) {
                result = DuplicateClassification.UNIQUE;
            } else if (previousFile.equals(sourceFile)) {
                result = DuplicateClassification.DUPLICATE_IN_WORKBOOK;
            } else {
                result = DuplicateClassification.DUPLICATE_ACROSS_WORKBOOKS;
            }
            report.getDuplicateStatistics().merge(scope + ":" + result.name(), 1, Integer::sum);
            return result;
        }
    }
}
