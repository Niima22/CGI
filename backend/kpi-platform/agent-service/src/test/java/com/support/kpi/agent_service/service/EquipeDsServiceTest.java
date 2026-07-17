package com.support.kpi.agent_service.service;

import com.support.kpi.agent_service.dto.EquipeRequest;
import com.support.kpi.agent_service.dto.EquipeResponse;
import com.support.kpi.agent_service.entity.EquipeDs;
import com.support.kpi.agent_service.repository.EquipeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EquipeDsServiceTest {

    @Mock
    private EquipeRepository equipeRepository;

    @InjectMocks
    private EquipeDsService equipeDsService;

    private EquipeRequest equipeRequest;
    private EquipeDs savedEquipe;
    private UUID equipeId;

    @BeforeEach
    void setUp() {
        equipeId = UUID.randomUUID();

        equipeRequest = new EquipeRequest();
        equipeRequest.setNom("Equipe Support Magasin");

        savedEquipe = new EquipeDs();
        savedEquipe.setId(equipeId);
        savedEquipe.setNom("Equipe Support Magasin");
    }

    @Test
    void shouldCreateEquipe_whenValidRequest() {
        when(equipeRepository.save(any(EquipeDs.class))).thenReturn(savedEquipe);
        when(equipeRepository.existsByNomIgnoreCase("Equipe Support Magasin")).thenReturn(false);

        EquipeResponse response = equipeDsService.createEquipe(equipeRequest);

        assertNotNull(response);
        assertEquals(equipeId, response.getId());
        assertEquals("Equipe Support Magasin", response.getNom());
        verify(equipeRepository, times(1)).save(any(EquipeDs.class));
    }

    @Test
    void shouldThrowException_whenEquipeNameAlreadyExists() {
        when(equipeRepository.existsByNomIgnoreCase("Equipe Support Magasin")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> equipeDsService.createEquipe(equipeRequest));
        verify(equipeRepository, never()).save(any(EquipeDs.class));
    }
}
