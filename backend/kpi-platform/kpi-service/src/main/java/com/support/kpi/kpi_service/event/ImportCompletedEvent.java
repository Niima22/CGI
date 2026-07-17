package com.support.kpi.kpi_service.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportCompletedEvent {
    private Long importId;
    private String filename;
    private String typeSource;
    private String statut;
    private Integer totalRows;
    private Integer insertedRows;
    private LocalDateTime timestamp;
}
