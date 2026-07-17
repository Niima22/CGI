package com.support.kpi.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginRequest {
    
    @NotBlank(message = "Le login est obligatoire")
    private String login;
    
    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;
}
