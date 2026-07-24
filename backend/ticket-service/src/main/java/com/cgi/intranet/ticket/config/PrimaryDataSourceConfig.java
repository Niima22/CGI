package com.cgi.intranet.ticket.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

/**
 * Declares the main application datasource explicitly.
 *
 * <p>This must exist as long as {@link AuthUserDirectoryConfig} declares a second
 * {@link DataSource} bean. Spring Boot's {@code DataSourceAutoConfiguration} is
 * {@code @ConditionalOnMissingBean(DataSource.class)}, so any hand-declared DataSource makes it
 * back off entirely. Without a {@code @Primary} bean bound to {@code spring.datasource.*}, all
 * JPA silently falls back to the auth-user directory datasource: {@code spring.datasource.url}
 * is ignored, and ticket/SLA queries run against {@code cgi_flow_auth} instead of
 * {@code cgi_flow_ticket}, returning empty results while the real tables hold data.
 */
@Configuration
public class PrimaryDataSourceConfig {

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
}
