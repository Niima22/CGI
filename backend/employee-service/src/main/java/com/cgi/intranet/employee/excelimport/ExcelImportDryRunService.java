package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportDryRunReport;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ExcelImportDryRunService {

    static final Set<String> APPROVED_FILES = Set.of(
            "CGI_CASA_06_04_2026_au_12_04_2026.xlsx",
            "tickets.xlsx",
            "planning 1.xlsx",
            "KPI - DS Magasin (1) (1).xlsx"
    );
    static final String EXCLUDED_HR_WORKBOOK = "MAR_Global_CDF__Form_v1.4.xlsm";

    private final ExcelImportNormalizer normalizer = new ExcelImportNormalizer();
    private final ExcelEnumMapper enumMapper = new ExcelEnumMapper(normalizer);
    private final TicketWorkbookDryRunProcessor ticketProcessor = new TicketWorkbookDryRunProcessor();
    private final CgiCasaDryRunProcessor cgiCasaProcessor = new CgiCasaDryRunProcessor();
    private final PlanningWorkbookDryRunProcessor planningProcessor = new PlanningWorkbookDryRunProcessor();
    private final KpiWorkbookDryRunProcessor kpiProcessor = new KpiWorkbookDryRunProcessor();

    public ImportDryRunReport analyze(Path excelDirectory) throws IOException {
        ImportDryRunReport report = new ImportDryRunReport();
        report.getExcludedFiles().add(EXCLUDED_HR_WORKBOOK);
        ExcelDryRunSupport.DuplicateClassifier duplicateClassifier = new ExcelDryRunSupport.DuplicateClassifier(report);
        for (String fileName : APPROVED_FILES) {
            Path workbookPath = excelDirectory.resolve(fileName);
            if (!Files.exists(workbookPath)) {
                report.getWarnings().add(new ImportDryRunModels.ImportValidationWarning(
                        "WORKBOOK_NOT_FOUND",
                        "sourceFile",
                        "Approved workbook was not found",
                        fileName,
                        new ImportDryRunModels.ImportSourceReference(fileName, "", 0, "", null)
                ));
                continue;
            }
            analyzeWorkbook(workbookPath, report, duplicateClassifier);
        }
        return report;
    }

    private void analyzeWorkbook(
            Path workbookPath,
            ImportDryRunReport report,
            ExcelDryRunSupport.DuplicateClassifier duplicateClassifier
    ) throws IOException {
        String sourceFile = workbookPath.getFileName().toString();
        if (EXCLUDED_HR_WORKBOOK.equals(sourceFile)) {
            report.getExcludedFiles().add(sourceFile);
            return;
        }
        report.getProcessedFiles().add(sourceFile);
        try (InputStream inputStream = Files.newInputStream(workbookPath);
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            DataFormatter formatter = new DataFormatter(Locale.FRANCE);
            ExcelDryRunSupport support = new ExcelDryRunSupport(
                    normalizer,
                    enumMapper,
                    formatter,
                    evaluator,
                    sourceFile,
                    report,
                    duplicateClassifier
            );
            for (Sheet sheet : workbook) {
                if (sourceFile.equals("tickets.xlsx")) {
                    ticketProcessor.process(sheet, support);
                } else if (sourceFile.startsWith("CGI_CASA_")) {
                    cgiCasaProcessor.process(sheet, support);
                } else if (sourceFile.equals("planning 1.xlsx")) {
                    planningProcessor.process(sheet, support);
                } else if (sourceFile.equals("KPI - DS Magasin (1) (1).xlsx")) {
                    kpiProcessor.process(sheet, support);
                }
            }
        }
    }

    public List<String> approvedFiles() {
        return APPROVED_FILES.stream().toList();
    }
}
