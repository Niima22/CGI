SELECT 'CREATE DATABASE cgi_flow_employee'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'cgi_flow_employee'
)\gexec

SELECT 'CREATE DATABASE cgi_flow_ticket'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'cgi_flow_ticket'
)\gexec

SELECT 'CREATE DATABASE cgi_flow_messaging'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'cgi_flow_messaging'
)\gexec

SELECT 'CREATE DATABASE quality_lab'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'quality_lab'
)\gexec
