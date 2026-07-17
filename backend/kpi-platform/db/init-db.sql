-- Dedicated KPI platform databases.
-- This script runs only inside the isolated kpi-postgres container.
-- Service schemas are owned by the maintained Spring Boot services.

SELECT 'CREATE DATABASE auth_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec
SELECT 'CREATE DATABASE agent_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agent_db')\gexec
SELECT 'CREATE DATABASE kpi_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kpi_db')\gexec
SELECT 'CREATE DATABASE nps_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nps_db')\gexec
SELECT 'CREATE DATABASE import_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'import_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE auth_db TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE agent_db TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE kpi_db TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE nps_db TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE import_db TO kpi_user;
