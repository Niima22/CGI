package com.support.kpi.agent_service.service;

import com.support.kpi.agent_service.dto.AgentRequest;
import com.support.kpi.agent_service.dto.AgentResponse;
import com.support.kpi.agent_service.entity.Agent;
import com.support.kpi.agent_service.entity.EquipeDs;
import com.support.kpi.agent_service.repository.AgentRepository;
import com.support.kpi.agent_service.repository.EquipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgentService {

    private final AgentRepository agentRepository;
    private final EquipeRepository equipeRepository;

    public List<AgentResponse> bulkImportAgents(List<AgentRequest> requests) {
        return requests.stream().map(this::upsertAgent).collect(Collectors.toList());
    }

    private AgentResponse upsertAgent(AgentRequest request) {
        Agent agent = null;

        if (request.getMatricule() != null && !request.getMatricule().isBlank() && !request.getMatricule().equals("Inconnu")) {
            agent = agentRepository.findByMatricule(request.getMatricule()).orElse(null);
        }
        if (agent == null && request.getLoginGrafana() != null && !request.getLoginGrafana().isBlank()) {
            agent = agentRepository.findByLoginGrafana(request.getLoginGrafana()).orElse(null);
        }
        if (agent == null && request.getCodeGdi() != null && !request.getCodeGdi().isBlank()) {
            agent = agentRepository.findByCodeGdi(request.getCodeGdi()).orElse(null);
        }
        if (agent == null && request.getLogCare() != null && !request.getLogCare().isBlank()) {
            agent = agentRepository.findByLogCare(request.getLogCare()).orElse(null);
        }
        if (agent == null && request.getNomNormalise() != null && !request.getNomNormalise().isBlank()) {
            agent = agentRepository.findByNomNormalise(request.getNomNormalise()).orElse(null);
        }

        if (agent == null) {
            agent = new Agent();
        }

        // Avoid unique constraint violations by deleting any conflicting agents (usually TEMP agents)
        final Agent currentAgent = agent;
        if (request.getLoginGrafana() != null && !request.getLoginGrafana().isBlank()) {
            agentRepository.findByLoginGrafana(request.getLoginGrafana()).ifPresent(conflict -> {
                if (currentAgent.getId() == null || !conflict.getId().equals(currentAgent.getId())) {
                    agentRepository.delete(conflict);
                    agentRepository.flush();
                }
            });
        }
        if (request.getCodeGdi() != null && !request.getCodeGdi().isBlank()) {
            agentRepository.findByCodeGdi(request.getCodeGdi()).ifPresent(conflict -> {
                if (currentAgent.getId() == null || !conflict.getId().equals(currentAgent.getId())) {
                    agentRepository.delete(conflict);
                    agentRepository.flush();
                }
            });
        }
        if (request.getLogCare() != null && !request.getLogCare().isBlank()) {
            agentRepository.findByLogCare(request.getLogCare()).ifPresent(conflict -> {
                if (currentAgent.getId() == null || !conflict.getId().equals(currentAgent.getId())) {
                    agentRepository.delete(conflict);
                    agentRepository.flush();
                }
            });
        }

        if (request.getMatricule() != null && !request.getMatricule().isBlank() && !request.getMatricule().equals("Inconnu")) {
            agent.setMatricule(request.getMatricule());
        } else if (agent.getMatricule() == null) {
            agent.setMatricule("TEMP_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000));
        }

        agent.setNom(request.getNom() != null ? request.getNom() : agent.getNom());
        agent.setPrenom(request.getPrenom() != null ? request.getPrenom() : agent.getPrenom());
        agent.setCodeGdi(request.getCodeGdi() != null ? request.getCodeGdi() : agent.getCodeGdi());
        agent.setLoginGrafana(request.getLoginGrafana() != null ? request.getLoginGrafana() : agent.getLoginGrafana());
        agent.setLogCare(request.getLogCare() != null ? request.getLogCare() : agent.getLogCare());
        agent.setNomNormalise(request.getNomNormalise() != null ? request.getNomNormalise() : agent.getNomNormalise());
        agent.setEmail(request.getEmail() != null ? request.getEmail() : agent.getEmail());
        agent.setLocation(request.getLocation() != null ? request.getLocation() : agent.getLocation());
        agent.setSvi(request.getSvi() != null ? request.getSvi() : agent.getSvi());
        agent.setLicence(request.getLicence() != null ? request.getLicence() : agent.getLicence());

        if (request.getBannette() != null && !request.getBannette().isBlank()) {
            EquipeDs equipe = equipeRepository.findByNomIgnoreCase(request.getBannette())
                    .orElseGet(() -> {
                        EquipeDs eq = new EquipeDs();
                        eq.setNom(request.getBannette());
                        return equipeRepository.save(eq);
                    });
            agent.setEquipe(equipe);
        }

        Agent saved = agentRepository.save(agent);
        return mapToResponse(saved);
    }

    public AgentResponse createAgent(AgentRequest request) {
        if (agentRepository.existsByMatricule(request.getMatricule())) {
            throw new IllegalArgumentException("Un agent avec ce matricule existe déjà.");
        }

        Agent agent = new Agent();
        agent.setMatricule(request.getMatricule());
        agent.setNom(request.getNom());
        agent.setPrenom(request.getPrenom());
        agent.setCodeGdi(request.getCodeGdi());
        agent.setLoginGrafana(request.getLoginGrafana());
        agent.setLogCare(request.getLogCare());
        agent.setNomNormalise(request.getNomNormalise());

        Agent savedAgent = agentRepository.save(agent);
        return mapToResponse(savedAgent);
    }

    public List<AgentResponse> getAllAgents() {
        return agentRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Optional<AgentResponse> getAgentById(UUID id) {
        return agentRepository.findById(id).map(this::mapToResponse);
    }

    public AgentResponse updateAgent(UUID id, AgentRequest request) {
        Agent agent = agentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agent non trouvé"));

        if (request.getBannette() != null && !request.getBannette().isBlank()) {
            EquipeDs equipe = equipeRepository.findByNomIgnoreCase(request.getBannette())
                    .orElseGet(() -> {
                        EquipeDs eq = new EquipeDs();
                        eq.setNom(request.getBannette());
                        return equipeRepository.save(eq);
                    });
            agent.setEquipe(equipe);
        }

        // Mettre à jour d'autres champs si nécessaire
        if (request.getNom() != null) agent.setNom(request.getNom());
        if (request.getPrenom() != null) agent.setPrenom(request.getPrenom());
        if (request.getEmail() != null) agent.setEmail(request.getEmail());
        if (request.getLoginGrafana() != null) agent.setLoginGrafana(request.getLoginGrafana());
        if (request.getCodeGdi() != null) agent.setCodeGdi(request.getCodeGdi());

        Agent updated = agentRepository.save(agent);
        return mapToResponse(updated);
    }

    public Optional<AgentResponse> getAgentByCodeGdi(String codeGdi) {
        return agentRepository.findByCodeGdi(codeGdi).map(this::mapToResponse);
    }

    public Optional<AgentResponse> getAgentByLoginGrafana(String loginGrafana) {
        Optional<Agent> agentOpt = agentRepository.findByLoginGrafana(loginGrafana);
        if (agentOpt.isEmpty()) {
            Agent newAgent = new Agent();
            newAgent.setLoginGrafana(loginGrafana);
            newAgent.setCodeGdi("GDI_" + loginGrafana);
            newAgent.setNom("Agent " + loginGrafana);
            newAgent.setPrenom("Inconnu");
            newAgent.setMatricule("TEMP_G_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000));
            Agent savedAgent = agentRepository.save(newAgent);
            return Optional.of(mapToResponse(savedAgent));
        }
        return agentOpt.map(this::mapToResponse);
    }

    public Optional<AgentResponse> getAgentByNomNormalise(String nomNormalise) {
        Optional<Agent> agentOpt = agentRepository.findByNomNormalise(nomNormalise);
        if (agentOpt.isEmpty()) {
            Agent newAgent = new Agent();
            newAgent.setNomNormalise(nomNormalise);
            newAgent.setCodeGdi("GDI_" + nomNormalise.replace(" ", "_"));
            newAgent.setNom(nomNormalise);
            newAgent.setPrenom("Inconnu");
            newAgent.setMatricule("TEMP_N_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000));
            Agent savedAgent = agentRepository.save(newAgent);
            return Optional.of(mapToResponse(savedAgent));
        }
        return agentOpt.map(this::mapToResponse);
    }

    private AgentResponse mapToResponse(Agent agent) {
        return AgentResponse.builder()
                .id(agent.getId())
                .matricule(agent.getMatricule())
                .nom(agent.getNom())
                .prenom(agent.getPrenom())
                .codeGdi(agent.getCodeGdi())
                .loginGrafana(agent.getLoginGrafana())
                .logCare(agent.getLogCare())
                .nomNormalise(agent.getNomNormalise())
                .email(agent.getEmail())
                .location(agent.getLocation())
                .svi(agent.getSvi())
                .licence(agent.getLicence())
                .equipeNom(agent.getEquipe() != null ? agent.getEquipe().getNom() : null)
                .build();
    }
}
