package com.support.kpi.agent_service.service;

import com.support.kpi.agent_service.dto.EquipeRequest;
import com.support.kpi.agent_service.dto.EquipeResponse;
import com.support.kpi.agent_service.entity.EquipeDs;
import com.support.kpi.agent_service.repository.EquipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EquipeDsService {

    private final EquipeRepository equipeRepository;

    public EquipeResponse createEquipe(EquipeRequest request) {
        if (equipeRepository.existsByNomIgnoreCase(request.getNom())) {
            throw new IllegalArgumentException("Une équipe avec ce nom existe déjà.");
        }

        EquipeDs equipe = new EquipeDs();
        equipe.setNom(request.getNom());

        EquipeDs savedEquipe = equipeRepository.save(equipe);

        return EquipeResponse.builder()
                .id(savedEquipe.getId())
                .nom(savedEquipe.getNom())
                .build();
    }

    public java.util.List<EquipeResponse> getAllEquipes() {
        return equipeRepository.findAll().stream()
                .map(equipe -> EquipeResponse.builder()
                        .id(equipe.getId())
                        .nom(equipe.getNom())
                        .build())
                .toList();
    }
}
