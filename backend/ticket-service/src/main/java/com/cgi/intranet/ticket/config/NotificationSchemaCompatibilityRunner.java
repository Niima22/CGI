package com.cgi.intranet.ticket.config;

import com.cgi.intranet.ticket.enums.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Arrays;
import java.util.stream.Collectors;

@Component
public class NotificationSchemaCompatibilityRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationSchemaCompatibilityRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public NotificationSchemaCompatibilityRunner(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public void run(ApplicationArguments args) {
        Boolean notificationsTableExists = jdbcTemplate.queryForObject(
                "select to_regclass('public.notifications') is not null",
                Boolean.class
        );
        if (!Boolean.TRUE.equals(notificationsTableExists)) {
            return;
        }

        String allowedValues = Arrays.stream(NotificationType.values())
                .map(NotificationType::name)
                .map(value -> "'" + value + "'")
                .collect(Collectors.joining(", "));

        jdbcTemplate.execute("alter table notifications drop constraint if exists notifications_type_check");
        jdbcTemplate.execute(
                "alter table notifications add constraint notifications_type_check "
                        + "check (type in (" + allowedValues + "))"
        );
        log.info("notifications_type_check synchronized with NotificationType enum values");
    }
}
