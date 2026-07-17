package com.support.kpi.auth_service.repository;

import com.support.kpi.auth_service.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {
    
    Optional<Utilisateur> findByLogin(String login);
    
    boolean existsByLogin(String login);
}
