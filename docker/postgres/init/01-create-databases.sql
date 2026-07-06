SELECT 'CREATE DATABASE cgi_flow_employee'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'cgi_flow_employee'
)\gexec
