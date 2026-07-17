package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportDryRunReport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Component
@Profile("excel-import-dry-run")
public class ExcelImportDryRunRunner implements CommandLineRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExcelImportDryRunRunner.class);

    private final ExcelImportDryRunService service;
    private final ExcelImportDryRunReportWriter writer;
    private final ApplicationContext applicationContext;

    public ExcelImportDryRunRunner(
            ExcelImportDryRunService service,
            ExcelImportDryRunReportWriter writer,
            ApplicationContext applicationContext
    ) {
        this.service = service;
        this.writer = writer;
        this.applicationContext = applicationContext;
    }

    @Override
    public void run(String... args) throws Exception {
        Path excelDirectory = resolveExcelDirectory(args);
        Path outputDirectory = Path.of(System.getProperty("user.dir")).resolve("target").resolve("excel-import-dry-run");
        LOGGER.info("Starting Excel dry-run from {}", excelDirectory);
        ImportDryRunReport report = service.analyze(excelDirectory);
        writer.write(report, outputDirectory);
        LOGGER.info(
                "Excel dry-run completed: files={}, employees={}, tickets={}, planning={}, kpi={}, warnings={}, errors={}, output={}",
                report.getProcessedFiles().size(),
                report.getEmployees().size(),
                report.getTickets().size(),
                report.getPlannings().size(),
                report.getHistoricalKpis().size(),
                report.getWarnings().size(),
                report.getErrors().size(),
                outputDirectory
        );
        int exitCode = SpringApplication.exit(applicationContext, () -> 0);
        System.exit(exitCode);
    }

    private Path resolveExcelDirectory(String[] args) {
        for (String arg : args) {
            if (arg == null || arg.isBlank() || arg.startsWith("--")) {
                continue;
            }
            Path candidate = Path.of(arg);
            if (java.nio.file.Files.isDirectory(candidate)) {
                return candidate;
            }
        }
        return Path.of(System.getProperty("user.dir")).resolve("..").resolve("..").resolve("dataexcel").normalize();
    }
}
