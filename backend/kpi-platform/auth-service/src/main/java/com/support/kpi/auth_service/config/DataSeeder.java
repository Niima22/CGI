package com.support.kpi.auth_service.config;

import com.support.kpi.auth_service.entity.Utilisateur;
import com.support.kpi.auth_service.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${kpi-platform.seed-demo-users:false}")
    private boolean seedDemoUsers;

    @Override
    public void run(String... args) throws Exception {
        if (!seedDemoUsers) {
            log.info("KPI platform demo user seeding disabled.");
            return;
        }

        if (utilisateurRepository.count() == 0) {
            log.info("Base de données auth_db vide. Injection des administrateurs par défaut...");

            Utilisateur admin = Utilisateur.builder()
                    .login("malika")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .nom("Superviseur")
                    .prenom("Malika")
                    .role("SUPERVISOR")
                    .actif(true)
                    .build();

            Utilisateur admin2 = Utilisateur.builder()
                    .login("zouhair")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .nom("Superviseur")
                    .prenom("Zouhair")
                    .role("SUPERVISOR")
                    .actif(true)
                    .build();

            Utilisateur agentTest = Utilisateur.builder()
                    .login("agent1")
                    .passwordHash(passwordEncoder.encode("agent123"))
                    .nom("Agent")
                    .prenom("Test")
                    .role("AGENT")
                    .actif(true)
                    .build();

            utilisateurRepository.saveAll(List.of(admin, admin2, agentTest));
            log.info("3 utilisateurs injectés avec succès (malika, zouhair, agent1). Mots de passe: admin123 / agent123");
        } else {
            log.info("La base auth_db contient déjà des utilisateurs. Pas de seeding.");
        }
    }
}
