package com.support.kpi.auth_service.service;

import com.support.kpi.auth_service.dto.LoginRequest;
import com.support.kpi.auth_service.dto.LoginResponse;
import com.support.kpi.auth_service.entity.Utilisateur;
import com.support.kpi.auth_service.repository.UtilisateurRepository;
import com.support.kpi.auth_service.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public LoginResponse authenticate(LoginRequest request) {
        // L'AuthenticationManager va utiliser UserDetailsServiceImpl et PasswordEncoder pour vérifier les identifiants
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getLogin(),
                        request.getPassword()
                )
        );

        // Si on arrive ici, les identifiants sont corrects
        Utilisateur utilisateur = utilisateurRepository.findByLogin(request.getLogin())
                .orElseThrow();

        // Mettre à jour la date de dernière connexion
        utilisateur.setDerniereConnexion(LocalDateTime.now());
        utilisateurRepository.save(utilisateur);

        // Générer le JWT
        String jwtToken = jwtService.generateToken(utilisateur);

        return LoginResponse.builder()
                .token(jwtToken)
                .login(utilisateur.getLogin())
                .nom(utilisateur.getNom())
                .prenom(utilisateur.getPrenom())
                .role(utilisateur.getRole())
                .build();
    }
}
