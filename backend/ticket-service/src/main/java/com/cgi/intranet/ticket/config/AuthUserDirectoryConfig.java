package com.cgi.intranet.ticket.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class AuthUserDirectoryConfig {

    // Primary datasource for JPA entities (tickets, SLA). Declaring the directory
    // DataSource bean below disables Spring Boot's auto-configured datasource, so the
    // main one must be defined explicitly and marked @Primary, otherwise all JPA would
    // fall back to the auth directory database.
    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @Primary
    DataSource dataSource(DataSourceProperties dataSourceProperties) {
        return dataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Bean
    @Qualifier("authUserDirectoryDataSource")
    DataSource authUserDirectoryDataSource(
            @Value("${services.auth-user.directory.datasource.url:jdbc:postgresql://127.0.0.1:55432/cgi_flow_auth}") String url,
            @Value("${services.auth-user.directory.datasource.username:postgres}") String username,
            @Value("${services.auth-user.directory.datasource.password:${POSTGRES_PASSWORD:postgres}}") String password
    ) {
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }
}
