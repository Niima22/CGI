package com.support.kpi.auth_service.security;

import com.support.kpi.auth_service.entity.Utilisateur;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private Utilisateur mockUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", "TestSecretKeyForDsMagasinVeryLongSecure2024!@#");
        ReflectionTestUtils.setField(jwtService, "jwtExpirationMs", 3600000L); // 1 heure
        jwtService.init();

        mockUser = Utilisateur.builder()
                .id(UUID.randomUUID())
                .login("testuser")
                .nom("Doe")
                .prenom("John")
                .role("SUPERVISOR")
                .build();
    }

    @Test
    void shouldGenerateValidToken() {
        String token = jwtService.generateToken(mockUser);
        
        assertNotNull(token);
        assertFalse(token.isEmpty());
        
        String login = jwtService.extractLogin(token);
        assertEquals("testuser", login);
        
        String role = jwtService.extractRole(token);
        assertEquals("SUPERVISOR", role);
    }

    @Test
    void shouldValidateTokenCorrectly() {
        String token = jwtService.generateToken(mockUser);
        assertTrue(jwtService.isTokenValid(token, "testuser"));
        assertFalse(jwtService.isTokenValid(token, "wronguser"));
    }
}
