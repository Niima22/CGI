package com.support.kpi.auth_service.security;

import com.support.kpi.auth_service.entity.Utilisateur;
import com.support.kpi.auth_service.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        Utilisateur utilisateur = utilisateurRepository.findByLogin(login)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec le login : " + login));

        if (!utilisateur.isActif()) {
            throw new RuntimeException("Le compte utilisateur est désactivé");
        }

        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + utilisateur.getRole());

        return new User(
                utilisateur.getLogin(),
                utilisateur.getPasswordHash(),
                Collections.singletonList(authority)
        );
    }
}
