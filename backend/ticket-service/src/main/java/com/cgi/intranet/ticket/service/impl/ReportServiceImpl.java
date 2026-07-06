package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.dto.response.EmployeeProductivityKpiResponse;
import com.cgi.intranet.ticket.dto.response.EmployeeWorkloadKpiResponse;
import com.cgi.intranet.ticket.dto.response.KpiEmployeeSummaryResponse;
import com.cgi.intranet.ticket.dto.response.SlaDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.SlaUrgentTicketResponse;
import com.cgi.intranet.ticket.dto.response.TicketDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.TicketPriorityDistributionResponse;
import com.cgi.intranet.ticket.dto.response.TicketStatusDistributionResponse;
import com.cgi.intranet.ticket.service.KpiService;
import com.cgi.intranet.ticket.service.ReportService;
import com.cgi.intranet.ticket.service.SlaService;
import com.cgi.intranet.ticket.service.TicketService;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.GrayColor;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.List;
import java.util.Locale;

@Service
public class ReportServiceImpl implements ReportService {

    private static final Locale REPORT_LOCALE = Locale.FRANCE;
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT).withLocale(REPORT_LOCALE);
    private static final Font TITLE_FONT = buildFont(16, Font.BOLD);
    private static final Font SECTION_FONT = buildFont(12, Font.BOLD);
    private static final Font LABEL_FONT = buildFont(10, Font.BOLD);
    private static final Font VALUE_FONT = buildFont(10, Font.NORMAL);
    private static final Font TABLE_HEADER_FONT = buildFont(9, Font.BOLD);
    private static final Font TABLE_BODY_FONT = buildFont(8, Font.NORMAL);
    private static final GrayColor HEADER_BACKGROUND = new GrayColor(0.92f);

    private final TicketService ticketService;
    private final SlaService slaService;
    private final KpiService kpiService;

    public ReportServiceImpl(
            TicketService ticketService,
            SlaService slaService,
            KpiService kpiService
    ) {
        this.ticketService = ticketService;
        this.slaService = slaService;
        this.kpiService = kpiService;
    }

    @Override
    public byte[] generateKpiSlaPdfReport() {
        TicketDashboardSummaryResponse ticketSummary = ticketService.getDashboardSummary();
        List<TicketStatusDistributionResponse> statusDistribution = ticketService.getStatusDistribution();
        List<TicketPriorityDistributionResponse> priorityDistribution = ticketService.getPriorityDistribution();
        SlaDashboardSummaryResponse slaSummary = slaService.getDashboardSummary();
        List<SlaUrgentTicketResponse> urgentTickets = slaService.getUrgentTickets(10);
        KpiEmployeeSummaryResponse employeeSummary = kpiService.getEmployeeSummary();
        List<EmployeeWorkloadKpiResponse> workload = kpiService.getEmployeeWorkload(10, null);
        List<EmployeeProductivityKpiResponse> productivity = kpiService.getEmployeeProductivity(10, null);

        return writePdf("Rapport KPI & SLA — CGI-FLOW", document -> {
            addExportDate(document, LocalDateTime.now());

            addSectionTitle(document, "Résumé incidents");
            addKeyValueGrid(document, List.of(
                    row("Total tickets", formatLong(ticketSummary.totalTickets())),
                    row("Incidents ouverts", formatLong(ticketSummary.openTickets())),
                    row("Tickets à faire", formatLong(ticketSummary.todoTickets())),
                    row("Tickets en cours", formatLong(ticketSummary.inProgressTickets())),
                    row("Tickets en attente", formatLong(ticketSummary.waitingTickets())),
                    row("Tickets résolus aujourd'hui", formatLong(ticketSummary.resolvedToday())),
                    row("Temps moyen de traitement", formatDurationMinutes(ticketSummary.averageTreatmentMinutes()))
            ), 2);

            addSectionTitle(document, "Répartition des incidents");
            addSimpleTable(document,
                    new String[]{"Statut", "Volume"},
                    statusDistribution.stream()
                            .map(item -> new String[]{item.statusLabel(), formatLong(item.count())})
                            .toList(),
                    new float[]{4f, 1.2f});
            addSimpleTable(document,
                    new String[]{"Priorité", "Volume"},
                    priorityDistribution.stream()
                            .map(item -> new String[]{item.priorityLabel(), formatLong(item.count())})
                            .toList(),
                    new float[]{4f, 1.2f});

            addSectionTitle(document, "Résumé SLA");
            addKeyValueGrid(document, List.of(
                    row("Taux de respect SLA", formatPercent(slaSummary.slaComplianceRate())),
                    row("Tickets respectés", formatLong(slaSummary.respectedTickets())),
                    row("Tickets en risque", formatLong(slaSummary.atRiskTickets())),
                    row("Tickets dépassés", formatLong(slaSummary.breachedTickets())),
                    row("Tickets critiques dépassés", formatLong(slaSummary.criticalBreachedTickets())),
                    row("Temps moyen de prise en charge", formatDurationMinutes(slaSummary.averageResponseMinutes())),
                    row("Temps moyen de résolution", formatDurationMinutes(slaSummary.averageResolutionMinutes()))
            ), 2);

            addSectionTitle(document, "KPI employés");
            addKeyValueGrid(document, List.of(
                    row("Agents avec tickets", formatLong(employeeSummary.totalAgentsWithTickets())),
                    row("Tickets actifs assignés", formatLong(employeeSummary.totalActiveAssignedTickets())),
                    row("Charge moyenne", formatDecimal(employeeSummary.averageWorkloadScore())),
                    row("Meilleur taux SLA", formatPercent(employeeSummary.bestSlaComplianceRate())),
                    row("Taux SLA le plus faible", formatPercent(employeeSummary.lowestSlaComplianceRate()))
            ), 2);

            addSectionTitle(document, "Tickets SLA urgents");
            addSimpleTable(document,
                    new String[]{"Référence", "Titre", "Statut ticket", "Priorité", "Criticité", "Statut SLA", "Temps restant", "Deadline"},
                    urgentTickets.stream()
                            .map(item -> new String[]{
                                    safe(item.ticketReference()),
                                    safe(item.ticketTitle()),
                                    safe(item.statusLabel()),
                                    safe(item.priorityLabel()),
                                    safe(item.criticalityLabel()),
                                    safe(item.globalStatusLabel()),
                                    formatRemainingMinutes(item.remainingMinutes()),
                                    formatDateTime(item.resolutionDeadline())
                            })
                            .toList(),
                    new float[]{1.2f, 2.8f, 1.6f, 1.2f, 1.2f, 1.3f, 1.4f, 1.8f});

            addSectionTitle(document, "Charge de travail par agent");
            addSimpleTable(document,
                    new String[]{"Agent", "Tickets actifs", "À faire", "En cours", "En attente", "En risque SLA", "Dépassés", "Critiques", "Score charge"},
                    workload.stream()
                            .map(item -> new String[]{
                                    safe(item.assignedUserLabel()),
                                    formatLong(item.totalAssignedTickets()),
                                    formatLong(item.todoTickets()),
                                    formatLong(item.inProgressTickets()),
                                    formatLong(item.waitingTickets()),
                                    formatLong(item.atRiskTickets()),
                                    formatLong(item.breachedTickets()),
                                    formatLong(item.criticalTickets()),
                                    formatLong(item.workloadScore())
                            })
                            .toList(),
                    new float[]{2.3f, 1.1f, 0.9f, 0.9f, 1f, 1.1f, 0.9f, 0.9f, 1f});

            addSectionTitle(document, "Productivité par agent");
            addSimpleTable(document,
                    new String[]{"Agent", "Tickets traités", "Résolus", "Fermés", "Temps moyen", "SLA respectés", "SLA dépassés", "Taux SLA"},
                    productivity.stream()
                            .map(item -> new String[]{
                                    safe(item.assignedUserLabel()),
                                    formatLong(item.processedTickets()),
                                    formatLong(item.resolvedTickets()),
                                    formatLong(item.closedTickets()),
                                    formatDurationMinutes(item.averageTreatmentMinutes()),
                                    formatLong(item.slaRespectedTickets()),
                                    formatLong(item.slaBreachedTickets()),
                                    formatPercent(item.slaComplianceRate())
                            })
                            .toList(),
                    new float[]{2.4f, 1.1f, 0.9f, 0.9f, 1.2f, 1f, 1f, 1f});
        });
    }

    @Override
    public byte[] generateSlaPdfReport() {
        SlaDashboardSummaryResponse slaSummary = slaService.getDashboardSummary();
        List<SlaUrgentTicketResponse> urgentTickets = slaService.getUrgentTickets(10);

        return writePdf("Rapport SLA — CGI-FLOW", document -> {
            addExportDate(document, LocalDateTime.now());

            addSectionTitle(document, "Résumé SLA");
            addKeyValueGrid(document, List.of(
                    row("Taux de respect SLA", formatPercent(slaSummary.slaComplianceRate())),
                    row("Tickets respectés", formatLong(slaSummary.respectedTickets())),
                    row("Tickets en risque", formatLong(slaSummary.atRiskTickets())),
                    row("Tickets dépassés", formatLong(slaSummary.breachedTickets())),
                    row("Tickets suspendus", formatLong(slaSummary.pausedTickets())),
                    row("Tickets non applicables", formatLong(slaSummary.notApplicableTickets())),
                    row("Tickets critiques dépassés", formatLong(slaSummary.criticalBreachedTickets())),
                    row("Temps moyen de prise en charge", formatDurationMinutes(slaSummary.averageResponseMinutes())),
                    row("Temps moyen de résolution", formatDurationMinutes(slaSummary.averageResolutionMinutes()))
            ), 2);

            addSectionTitle(document, "Table des tickets SLA urgents");
            addSimpleTable(document,
                    new String[]{"Référence", "Titre", "Statut ticket", "Priorité", "Criticité", "Statut SLA", "Temps restant", "Deadline"},
                    urgentTickets.stream()
                            .map(item -> new String[]{
                                    safe(item.ticketReference()),
                                    safe(item.ticketTitle()),
                                    safe(item.statusLabel()),
                                    safe(item.priorityLabel()),
                                    safe(item.criticalityLabel()),
                                    safe(item.globalStatusLabel()),
                                    formatRemainingMinutes(item.remainingMinutes()),
                                    formatDateTime(item.resolutionDeadline())
                            })
                            .toList(),
                    new float[]{1.2f, 2.8f, 1.6f, 1.2f, 1.2f, 1.3f, 1.4f, 1.8f});
        });
    }

    private byte[] writePdf(String title, PdfContentWriter writer) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 50, 42);
        try {
            PdfWriter pdfWriter = PdfWriter.getInstance(document, output);
            pdfWriter.setPageEvent(new FooterEvent());
            document.open();
            addTitle(document, title);
            writer.write(document);
        } catch (DocumentException exception) {
            throw new IllegalStateException("Impossible de générer le rapport PDF.", exception);
        } finally {
            document.close();
        }
        return output.toByteArray();
    }

    private static void addTitle(Document document, String title) throws DocumentException {
        Paragraph paragraph = new Paragraph(title, TITLE_FONT);
        paragraph.setSpacingAfter(12f);
        paragraph.setAlignment(Element.ALIGN_LEFT);
        document.add(paragraph);
    }

    private static void addExportDate(Document document, LocalDateTime exportedAt) throws DocumentException {
        Paragraph paragraph = new Paragraph("Date d’export : " + formatDateTime(exportedAt), VALUE_FONT);
        paragraph.setSpacingAfter(12f);
        document.add(paragraph);
    }

    private static void addSectionTitle(Document document, String title) throws DocumentException {
        Paragraph paragraph = new Paragraph(title, SECTION_FONT);
        paragraph.setSpacingBefore(6f);
        paragraph.setSpacingAfter(6f);
        document.add(paragraph);
    }

    private static void addKeyValueGrid(Document document, List<KeyValueRow> rows, int columns) throws DocumentException {
        PdfPTable table = new PdfPTable(columns * 2);
        table.setWidthPercentage(100f);
        table.setSpacingAfter(8f);
        table.getDefaultCell().setBorder(Rectangle.NO_BORDER);
        for (KeyValueRow row : rows) {
            PdfPCell labelCell = new PdfPCell(new Phrase(row.label(), LABEL_FONT));
            labelCell.setBorder(Rectangle.BOX);
            labelCell.setBorderColor(HEADER_BACKGROUND);
            labelCell.setBackgroundColor(HEADER_BACKGROUND);
            labelCell.setPadding(5f);
            PdfPCell valueCell = new PdfPCell(new Phrase(row.value(), VALUE_FONT));
            valueCell.setPadding(5f);
            table.addCell(labelCell);
            table.addCell(valueCell);
        }
        document.add(table);
    }

    private static void addSimpleTable(
            Document document,
            String[] headers,
            List<String[]> rows,
            float[] widths
    ) throws DocumentException {
        PdfPTable table = new PdfPTable(headers.length);
        table.setWidthPercentage(100f);
        table.setWidths(widths);
        table.setSpacingAfter(10f);

        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, TABLE_HEADER_FONT));
            cell.setBackgroundColor(HEADER_BACKGROUND);
            cell.setPadding(5f);
            table.addCell(cell);
        }

        if (rows.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("Aucune donnée disponible.", VALUE_FONT));
            empty.setColspan(headers.length);
            empty.setPadding(6f);
            table.addCell(empty);
        } else {
            for (String[] row : rows) {
                for (String value : row) {
                    PdfPCell cell = new PdfPCell(new Phrase(value, TABLE_BODY_FONT));
                    cell.setPadding(4.5f);
                    table.addCell(cell);
                }
            }
        }

        document.add(table);
    }

    private static KeyValueRow row(String label, String value) {
        return new KeyValueRow(label, value);
    }

    private static String formatLong(long value) {
        return java.text.NumberFormat.getIntegerInstance(REPORT_LOCALE).format(value);
    }

    private static String formatDecimal(Double value) {
        if (value == null || value.isNaN()) {
            return "-";
        }
        java.text.NumberFormat formatter = java.text.NumberFormat.getNumberInstance(REPORT_LOCALE);
        formatter.setMinimumFractionDigits(value % 1 == 0 ? 0 : 1);
        formatter.setMaximumFractionDigits(1);
        return formatter.format(value);
    }

    private static String formatPercent(Double value) {
        if (value == null || value.isNaN()) {
            return "-";
        }
        return formatDecimal(value) + " %";
    }

    private static String formatDurationMinutes(Double value) {
        if (value == null || value.isNaN()) {
            return "-";
        }
        long rounded = Math.round(value);
        if (rounded < 60) {
            return rounded + " min";
        }
        long hours = rounded / 60;
        long minutes = rounded % 60;
        if (minutes == 0) {
            return hours + " h";
        }
        return hours + " h " + minutes + " min";
    }

    private static String formatRemainingMinutes(Long value) {
        if (value == null) {
            return "-";
        }
        long absolute = Math.abs(value);
        if (absolute < 60) {
            return value < 0 ? "Dépassé de " + absolute + " min" : "Reste " + absolute + " min";
        }
        long hours = absolute / 60;
        long minutes = absolute % 60;
        String formatted = minutes == 0 ? hours + " h" : hours + " h " + minutes + " min";
        return value < 0 ? "Dépassé de " + formatted : "Reste " + formatted;
    }

    private static String formatDateTime(LocalDateTime value) {
        return value == null ? "-" : DATE_TIME_FORMATTER.format(value);
    }

    private static String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private static Font buildFont(float size, int style) {
        try {
            BaseFont baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            return new Font(baseFont, size, style);
        } catch (Exception exception) {
            return new Font(Font.HELVETICA, size, style);
        }
    }

    @FunctionalInterface
    private interface PdfContentWriter {
        void write(Document document) throws DocumentException;
    }

    private record KeyValueRow(String label, String value) {
    }

    private static class FooterEvent extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            Phrase footer = new Phrase("Généré par CGI-FLOW", VALUE_FONT);
            com.lowagie.text.pdf.ColumnText.showTextAligned(
                    writer.getDirectContent(),
                    Element.ALIGN_CENTER,
                    footer,
                    (document.right() + document.left()) / 2,
                    document.bottom() - 14,
                    0
            );
        }
    }
}
