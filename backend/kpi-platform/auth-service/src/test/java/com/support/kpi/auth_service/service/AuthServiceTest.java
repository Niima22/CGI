package com.support.kpi.auth_service.service;

import com.support.kpi.auth_service.dto.LoginRequest;
import com.support.kpi.auth_service.dto.LoginResponse;
import com.support.kpi.auth_service.entity.Utilisateur;
import com.support.kpi.auth_service.repository.UtilisateurRepository;
import com.support.kpi.auth_service.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UtilisateurRepository utilisateurRepository;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private Utilisateur mockUser;

    @BeforeEach
    void setUp() {
        mockUser = Utilisateur.builder()
                .login("testuser")
                .nom("Doe")
                .prenom("John")
                .role("SUPERVISOR")
                .build();
    }

    @Test
    void shouldAuthenticateUserAndReturnToken() {
        LoginRequest request = new LoginRequest("testuser", "password");
        
        when(utilisateurRepository.findByLogin("testuser")).thenReturn(Optional.of(mockUser));
        when(jwtService.generateToken(mockUser)).thenReturn("mocked.jwt.token");

        LoginResponse response = authService.authenticate(request);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getToken());
        assertEquals("testuser", response.getLogin());
        assertEquals("SUPERVISOR", response.getRole());

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(utilisateurRepository).save(mockUser); // vérifie la mise à jour de la date de connexion
    }
}
