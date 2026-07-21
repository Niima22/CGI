package com.cgi.intranet.employee.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Configuration
public class SecurityConfig {

    private static final Set<String> BUSINESS_ROLES = Set.of("ADMIN", "MANAGER", "EMPLOYEE");

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            Converter<Jwt, AbstractAuthenticationToken> keycloakJwtAuthenticationConverter
    ) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/employees/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/profiles/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/employees/me")
                        .hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/me/availability-status")
                        .hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/me/profile")
                        .hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.POST, "/api/employees/me/profile-photo")
                        .hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/employees", "/api/employees/*")
                        .hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/departments", "/api/departments/*")
                        .hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.POST, "/api/departments").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/departments/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/departments/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/employees/import/preview").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/employees/import/confirm").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/employees").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/employees/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/*/availability-status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/*/department").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/*/link-user").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/*/manager").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/employees/*/bannette").hasAnyRole("ADMIN", "MANAGER")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtAuthenticationConverter))
                )
                .build();
    }

    @Bean
    Converter<Jwt, AbstractAuthenticationToken> keycloakJwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(this::extractRealmRoles);
        converter.setPrincipalClaimName("preferred_username");
        return converter;
    }

    private Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
            return List.of();
        }

        return roles.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .filter(BUSINESS_ROLES::contains)
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .map(GrantedAuthority.class::cast)
                .toList();
    }
}
