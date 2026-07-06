package com.cgi.intranet.ticket.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.util.List;

@Repository
public class AuthUserDirectoryRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthUserDirectoryRepository(@Qualifier("authUserDirectoryDataSource") DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
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
}
