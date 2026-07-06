package com.cgi.intranet.authuser.repository;

import com.cgi.intranet.authuser.entity.UserProfile;
import com.cgi.intranet.authuser.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    Optional<UserProfile> findByKeycloakId(String keycloakId);

    Optional<UserProfile> findByEmail(String email);

    List<UserProfile> findByRole(Role role);

    List<UserProfile> findByActiveTrue();

    List<UserProfile> findByActiveTrueOrderByFullNameAsc();

    Optional<UserProfile> findByIdAndActiveTrue(Long id);

    boolean existsByKeycloakId(String keycloakId);

    boolean existsByEmail(String email);
}
