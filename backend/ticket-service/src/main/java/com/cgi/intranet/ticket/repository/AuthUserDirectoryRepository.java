package com.cgi.intranet.ticket.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Repository
public class AuthUserDirectoryRepository {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public AuthUserDirectoryRepository(@Qualifier("authUserDirectoryDataSource") DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
        this.namedParameterJdbcTemplate = new NamedParameterJdbcTemplate(dataSource);
    }

    public List<Long> findActiveUserIdsByRole(String role) {
        return jdbcTemplate.queryForList(
                """
                select id
                from user_profiles
                where role = ?
                  and active = true
                order by id
                """,
                Long.class,
                role
        );
    }

    public Map<Long, String> findUserLabelsByIds(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }

        return namedParameterJdbcTemplate.query(
                """
                select id, full_name, email
                from user_profiles
                where id in (:userIds)
                """,
                new MapSqlParameterSource("userIds", userIds),
                (rs, rowNum) -> Map.entry(
                        rs.getLong("id"),
                        resolveUserLabel(rs.getString("full_name"), rs.getString("email"), rs.getLong("id"))
                )
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private String resolveUserLabel(String fullName, String email, Long id) {
        if (fullName != null && !fullName.isBlank()) {
            return fullName;
        }
        if (email != null && !email.isBlank()) {
            return email;
        }
        return "Utilisateur " + id;
    }
}
