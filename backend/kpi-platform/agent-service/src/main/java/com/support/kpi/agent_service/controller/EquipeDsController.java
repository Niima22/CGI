package com.support.kpi.agent_service.controller;

import com.support.kpi.agent_service.dto.EquipeRequest;
import com.support.kpi.agent_service.dto.EquipeResponse;
import com.support.kpi.agent_service.service.EquipeDsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipes")
@RequiredArgsConstructor
public class EquipeDsController {

    private final EquipeDsService equipeDsService;

    @PostMapping
    public ResponseEntity<EquipeResponse> createEquipe(@Valid @RequestBody EquipeRequest request) {
        EquipeResponse response = equipeDsService.createEquipe(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<EquipeResponse>> getAllEquipes() {
        return ResponseEntity.ok(equipeDsService.getAllEquipes());
    }
}
