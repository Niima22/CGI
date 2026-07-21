param(
    [switch]$SkipExcelImport
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Split-Path -Parent $PSScriptRoot
$container = "cgi-flow-auth-postgres"

function Import-DotEnv {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    foreach ($line in Get-Content -Path $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $parts = $trimmed -split "=", 2
        if ($parts.Count -ne 2) {
            continue
        }

        [System.Environment]::SetEnvironmentVariable(
            $parts[0].Trim(),
            $parts[1].Trim().Trim('"').Trim("'"),
            "Process"
        )
    }
}

function Invoke-DbSql {
    param(
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$Sql
    )

    $Sql | & docker exec -i $container psql -v ON_ERROR_STOP=1 -U $env:POSTGRES_USER -d $Database
    if ($LASTEXITCODE -ne 0) {
        throw "SQL execution failed for database $Database."
    }
}

function Invoke-DbScalar {
    param(
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$Sql
    )

    $value = & docker exec $container psql -v ON_ERROR_STOP=1 -U $env:POSTGRES_USER -d $Database -t -A -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "SQL query failed for database $Database."
    }
    return ($value | Select-Object -First 1).Trim()
}

Import-DotEnv (Join-Path $repoRoot ".env")

if (-not $env:POSTGRES_USER) { $env:POSTGRES_USER = "postgres" }
if (-not $env:AUTH_DB_NAME) { $env:AUTH_DB_NAME = "cgi_flow_auth" }
if (-not $env:TICKET_DB_NAME) { $env:TICKET_DB_NAME = "cgi_flow_ticket" }
if (-not $env:EMPLOYEE_DB_NAME) { $env:EMPLOYEE_DB_NAME = "cgi_flow_employee" }
if (-not $env:PLANNING_DB_NAME) { $env:PLANNING_DB_NAME = "cgi_flow_planning" }
if (-not $env:MESSAGING_DB_NAME) { $env:MESSAGING_DB_NAME = "cgi_flow_messaging" }

$runningContainers = & docker ps --format "{{.Names}}"
if ($LASTEXITCODE -ne 0 -or -not ($runningContainers -contains $container)) {
    throw "Docker container $container is not running. Start the stack first."
}

if (-not $SkipExcelImport) {
    Write-Host "Importing Excel data from dataexcel..."
    & (Join-Path $PSScriptRoot "import-excel-data.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "Excel import failed."
    }
}

Write-Host "Seeding auth profiles for manager demo agents..."
Invoke-DbSql $env:AUTH_DB_NAME @"
insert into user_profiles (email, full_name, keycloak_id, role, active, created_at, updated_at)
values
    ('mgr.demo.agent1@cgi.local', 'Abdelilah Saoudi', 'mgr-demo-agent-001', 'EMPLOYEE', true, now(), now()),
    ('mgr.demo.agent2@cgi.local', 'Ranya Kissami', 'mgr-demo-agent-002', 'EMPLOYEE', true, now(), now()),
    ('mgr.demo.agent3@cgi.local', 'Fatima Ezzahra Amanne', 'mgr-demo-agent-003', 'EMPLOYEE', true, now(), now()),
    ('mgr.demo.agent4@cgi.local', 'Othmane Janah', 'mgr-demo-agent-004', 'EMPLOYEE', true, now(), now()),
    ('mgr.demo.agent5@cgi.local', 'Chaimae El Kadiri', 'mgr-demo-agent-005', 'EMPLOYEE', true, now(), now())
on conflict (email) do update set
    full_name = excluded.full_name,
    keycloak_id = excluded.keycloak_id,
    role = excluded.role,
    active = true,
    updated_at = now();
"@

$managerId = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'superviseur@cgi.local'"
$managerKeycloakId = Invoke-DbScalar $env:AUTH_DB_NAME "select keycloak_id from user_profiles where email = 'superviseur@cgi.local'"
$adminId = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'pilote@cgi.local'"
$agent1Id = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'agent@cgi.local'"
$agent2Id = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'agentb.module6@cgi.local'"
$demoAgent1Id = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'mgr.demo.agent1@cgi.local'"
$demoAgent2Id = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'mgr.demo.agent2@cgi.local'"
$demoAgent3Id = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'mgr.demo.agent3@cgi.local'"
$demoAgent4Id = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'mgr.demo.agent4@cgi.local'"
$demoAgent5Id = Invoke-DbScalar $env:AUTH_DB_NAME "select id from user_profiles where email = 'mgr.demo.agent5@cgi.local'"

Write-Host "Seeding manager team employees..."
Invoke-DbSql $env:EMPLOYEE_DB_NAME @"
insert into departments (name, description, active, manager_keycloak_id, created_at, updated_at)
values ('DS Magasin Manager Demo', 'Equipe issue des fichiers Excel DS Magasin pour tests Pilote.', true, '$managerKeycloakId', now(), now())
on conflict (name) do update set
    description = excluded.description,
    active = true,
    manager_keycloak_id = excluded.manager_keycloak_id,
    updated_at = now();

insert into employees (
    user_keycloak_id, email, full_name, job_title, department, bannette,
    operational_status, activity_status, manager_keycloak_id, account_status,
    availability_status, created_at, updated_at
)
values
    ('mgr-demo-agent-001', 'mgr.demo.agent1@cgi.local', 'Abdelilah Saoudi', 'Agent Front Office', 'DS Magasin Manager Demo', 'FO', 'Production', 'Ticket handling', '$managerKeycloakId', 'ACTIVE', 'AVAILABLE', now(), now()),
    ('mgr-demo-agent-002', 'mgr.demo.agent2@cgi.local', 'Ranya Kissami', 'Agent Support', 'DS Magasin Manager Demo', 'Support', 'Production', 'Backlog cleanup', '$managerKeycloakId', 'ACTIVE', 'IN_COMMUNICATION', now(), now()),
    ('mgr-demo-agent-003', 'mgr.demo.agent3@cgi.local', 'Fatima Ezzahra Amanne', 'Agent Front Office', 'DS Magasin Manager Demo', 'FO', 'Production', 'Escalations', '$managerKeycloakId', 'ACTIVE', 'BREAK', now(), now()),
    ('mgr-demo-agent-004', 'mgr.demo.agent4@cgi.local', 'Othmane Janah', 'Agent Support', 'DS Magasin Manager Demo', 'Support', 'Standby', 'Validation', '$managerKeycloakId', 'ACTIVE', 'LEAVE', now(), now()),
    ('mgr-demo-agent-005', 'mgr.demo.agent5@cgi.local', 'Chaimae El Kadiri', 'Agent Front Office', 'DS Magasin Manager Demo', 'FO', 'Production', 'SLA watch', '$managerKeycloakId', 'ACTIVE', 'OFFLINE', now(), now())
on conflict (email) do update set
    full_name = excluded.full_name,
    job_title = excluded.job_title,
    department = excluded.department,
    bannette = excluded.bannette,
    operational_status = excluded.operational_status,
    activity_status = excluded.activity_status,
    manager_keycloak_id = excluded.manager_keycloak_id,
    account_status = excluded.account_status,
    availability_status = excluded.availability_status,
    updated_at = now();

update employees
set manager_keycloak_id = '$managerKeycloakId',
    department = 'DS Magasin Manager Demo',
    bannette = 'FO',
    availability_status = case email
        when 'agent@cgi.local' then 'AVAILABLE'
        when 'agentb.module6@cgi.local' then 'IN_COMMUNICATION'
        else availability_status
    end,
    updated_at = now()
where email in ('agent@cgi.local', 'agentb.module6@cgi.local');
"@

Write-Host "Seeding manager ticket cases, SLA states, history, and notifications..."
Invoke-DbSql $env:TICKET_DB_NAME @"
create table if not exists notifications (
    id bigint generated by default as identity primary key,
    recipient_user_id bigint not null,
    ticket_id bigint,
    type varchar(40) not null,
    title varchar(255) not null,
    message varchar(2000) not null,
    is_read boolean not null default false,
    created_at timestamp(6) without time zone not null default now(),
    read_at timestamp(6) without time zone,
    constraint uk_notification_recipient_ticket_type unique (recipient_user_id, ticket_id, type),
    constraint notifications_type_check check (type in (
        'TICKET_ASSIGNED',
        'TICKET_REASSIGNED',
        'TICKET_STATUS_UPDATED',
        'TICKET_PENDING_REMINDER',
        'SLA_AT_RISK',
        'SLA_BREACHED',
        'SLA_ESCALATION_LEVEL_1',
        'SLA_ESCALATION_LEVEL_2'
    ))
);

with demo_refs(reference) as (
    values
        ('MGR-DEMO-NEW'),
        ('MGR-DEMO-TODO'),
        ('MGR-DEMO-ASSIGNED'),
        ('MGR-DEMO-INPROG'),
        ('MGR-DEMO-RISK'),
        ('MGR-DEMO-BREACH'),
        ('MGR-DEMO-RESOLVED'),
        ('MGR-DEMO-CLOSED'),
        ('MGR-DEMO-REOPEN'),
        ('MGR-DEMO-VALID')
),
demo_tickets as (
    select id from tickets where reference in (select reference from demo_refs)
)
delete from notifications where ticket_id in (select id from demo_tickets);

with demo_refs(reference) as (
    values
        ('MGR-DEMO-NEW'),
        ('MGR-DEMO-TODO'),
        ('MGR-DEMO-ASSIGNED'),
        ('MGR-DEMO-INPROG'),
        ('MGR-DEMO-RISK'),
        ('MGR-DEMO-BREACH'),
        ('MGR-DEMO-RESOLVED'),
        ('MGR-DEMO-CLOSED'),
        ('MGR-DEMO-REOPEN'),
        ('MGR-DEMO-VALID')
),
demo_tickets as (
    select id from tickets where reference in (select reference from demo_refs)
)
delete from ticket_history where ticket_id in (select id from demo_tickets);

insert into tickets (
    reference, title, description, status, type, category, sub_category,
    priority, criticality, requester_id, assigned_user_id, assigned_team_id,
    department_id, created_at, updated_at, assigned_at, started_at,
    resolved_at, closed_at, deleted, deleted_at
)
values
    ('MGR-DEMO-NEW', 'Incident caisse prioritaire', 'Cas importe du contexte tickets.xlsx: incident caisse a qualifier par le Pilote.', 'NEW', 'INCIDENT', 'Encaissement', 'Caisse', 'URGENT', 'CRITICAL', $agent1Id, null, 101, 1, now() - interval '3 hours', now(), null, null, null, null, false, null),
    ('MGR-DEMO-TODO', 'Traitement compte client bloque', 'Ticket en attente d affectation pour tester la file a faire.', 'TODO', 'REQUEST', 'Compte client', 'Acces', 'HIGH', 'HIGH', $demoAgent1Id, null, 101, 1, now() - interval '2 hours', now(), null, null, null, null, false, null),
    ('MGR-DEMO-ASSIGNED', 'Synchronisation METI lente', 'Ticket affecte a un agent disponible pour tester affectation/reaffectation.', 'ASSIGNED', 'INCIDENT', 'METI', 'Synchronisation', 'MEDIUM', 'MEDIUM', $agent1Id, $demoAgent1Id, 101, 1, now() - interval '5 hours', now(), now() - interval '4 hours', null, null, null, false, null),
    ('MGR-DEMO-INPROG', 'Erreur libelle produit', 'Cas Excel typique deja pris en charge par l equipe.', 'IN_PROGRESS', 'INCIDENT', 'Produit', 'Libelle', 'HIGH', 'HIGH', $agent1Id, $demoAgent2Id, 101, 1, now() - interval '8 hours', now(), now() - interval '7 hours', now() - interval '6 hours', null, null, false, null),
    ('MGR-DEMO-RISK', 'Rejet commande fournisseur', 'Ticket proche de son echeance SLA pour tester filtre en risque.', 'IN_PROGRESS', 'PROBLEM', 'Commande', 'Fournisseur', 'URGENT', 'CRITICAL', $demoAgent3Id, $agent2Id, 101, 1, now() - interval '10 hours', now(), now() - interval '9 hours', now() - interval '8 hours', null, null, false, null),
    ('MGR-DEMO-BREACH', 'Indisponibilite acces magasin', 'Ticket en retard SLA pour tester alerte depassee et escalation.', 'WAITING_PROVIDER', 'INCIDENT', 'Acces', 'Magasin', 'URGENT', 'CRITICAL', $demoAgent4Id, $demoAgent2Id, 101, 1, now() - interval '30 hours', now(), now() - interval '29 hours', now() - interval '28 hours', null, null, false, null),
    ('MGR-DEMO-RESOLVED', 'Correction prix article', 'Ticket resolu en attente de validation Pilote.', 'RESOLVED', 'INCIDENT', 'Article', 'Prix', 'MEDIUM', 'MEDIUM', $demoAgent5Id, $demoAgent3Id, 101, 1, now() - interval '1 day', now(), now() - interval '23 hours', now() - interval '22 hours', now() - interval '2 hours', null, false, null),
    ('MGR-DEMO-CLOSED', 'Demande export KPI hebdo', 'Ticket ferme pour tester cycle complet et KPI resolution.', 'CLOSED', 'REQUEST', 'Reporting', 'KPI', 'LOW', 'LOW', $agent1Id, $demoAgent4Id, 101, 1, now() - interval '2 days', now(), now() - interval '46 hours', now() - interval '45 hours', now() - interval '26 hours', now() - interval '24 hours', false, null),
    ('MGR-DEMO-REOPEN', 'Controle stock relance', 'Ticket rouvert apres resolution insuffisante.', 'REOPENED', 'INCIDENT', 'Stock', 'Controle', 'HIGH', 'HIGH', $demoAgent1Id, $demoAgent5Id, 101, 1, now() - interval '3 days', now(), now() - interval '70 hours', now() - interval '69 hours', null, null, false, null),
    ('MGR-DEMO-VALID', 'Validation diagnostic litige', 'Ticket en attente de validation manager avec diagnostic et actions.', 'WAITING_MANAGER_VALIDATION', 'PROBLEM', 'Litige', 'Diagnostic', 'HIGH', 'CRITICAL', $demoAgent2Id, $demoAgent1Id, 101, 1, now() - interval '6 hours', now(), now() - interval '5 hours', now() - interval '4 hours', null, null, false, null)
on conflict (reference) do update set
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    type = excluded.type,
    category = excluded.category,
    sub_category = excluded.sub_category,
    priority = excluded.priority,
    criticality = excluded.criticality,
    requester_id = excluded.requester_id,
    assigned_user_id = excluded.assigned_user_id,
    assigned_team_id = excluded.assigned_team_id,
    department_id = excluded.department_id,
    updated_at = now(),
    assigned_at = excluded.assigned_at,
    started_at = excluded.started_at,
    resolved_at = excluded.resolved_at,
    closed_at = excluded.closed_at,
    deleted = false,
    deleted_at = null;

insert into ticket_sla (
    ticket_id, policy_id, response_deadline, resolution_deadline, first_response_at,
    resolved_at, response_status, resolution_status, global_status, elapsed_minutes,
    remaining_minutes, consumed_percentage, breach_reason, last_calculated_at,
    escalation_level, last_alert_at, last_escalation_at, created_at, updated_at
)
select t.id, null,
    case t.reference
        when 'MGR-DEMO-BREACH' then now() - interval '10 hours'
        else now() + interval '2 hours'
    end,
    case t.reference
        when 'MGR-DEMO-RISK' then now() + interval '25 minutes'
        when 'MGR-DEMO-BREACH' then now() - interval '6 hours'
        else now() + interval '8 hours'
    end,
    case when t.status in ('IN_PROGRESS', 'WAITING_PROVIDER', 'RESOLVED', 'CLOSED', 'REOPENED', 'WAITING_MANAGER_VALIDATION') then t.started_at else null end,
    t.resolved_at,
    case
        when t.reference = 'MGR-DEMO-BREACH' then 'BREACHED'
        when t.reference = 'MGR-DEMO-RISK' then 'AT_RISK'
        else 'RESPECTED'
    end,
    case
        when t.reference = 'MGR-DEMO-BREACH' then 'BREACHED'
        when t.reference = 'MGR-DEMO-RISK' then 'AT_RISK'
        else 'RESPECTED'
    end,
    case
        when t.reference = 'MGR-DEMO-BREACH' then 'BREACHED'
        when t.reference = 'MGR-DEMO-RISK' then 'AT_RISK'
        else 'RESPECTED'
    end,
    case
        when t.reference = 'MGR-DEMO-BREACH' then 1800
        when t.reference = 'MGR-DEMO-RISK' then 575
        else 120
    end,
    case
        when t.reference = 'MGR-DEMO-BREACH' then -360
        when t.reference = 'MGR-DEMO-RISK' then 25
        else 480
    end,
    case
        when t.reference = 'MGR-DEMO-BREACH' then 125.0
        when t.reference = 'MGR-DEMO-RISK' then 92.0
        else 30.0
    end,
    case
        when t.reference = 'MGR-DEMO-BREACH' then 'Resolution deadline exceeded in demo data.'
        when t.reference = 'MGR-DEMO-RISK' then 'Resolution deadline is close.'
        else null
    end,
    now(),
    case when t.reference = 'MGR-DEMO-BREACH' then 1 else 0 end,
    case when t.reference in ('MGR-DEMO-RISK', 'MGR-DEMO-BREACH') then now() - interval '15 minutes' else null end,
    case when t.reference = 'MGR-DEMO-BREACH' then now() - interval '5 minutes' else null end,
    now(),
    now()
from tickets t
where t.reference like 'MGR-DEMO-%'
on conflict (ticket_id) do update set
    response_deadline = excluded.response_deadline,
    resolution_deadline = excluded.resolution_deadline,
    first_response_at = excluded.first_response_at,
    resolved_at = excluded.resolved_at,
    response_status = excluded.response_status,
    resolution_status = excluded.resolution_status,
    global_status = excluded.global_status,
    elapsed_minutes = excluded.elapsed_minutes,
    remaining_minutes = excluded.remaining_minutes,
    consumed_percentage = excluded.consumed_percentage,
    breach_reason = excluded.breach_reason,
    last_calculated_at = now(),
    escalation_level = excluded.escalation_level,
    last_alert_at = excluded.last_alert_at,
    last_escalation_at = excluded.last_escalation_at,
    updated_at = now();

insert into ticket_history (ticket_id, action_type, old_value, new_value, comment, performed_by, created_at)
select id, 'CREATED', null, reference, 'Demo manager ticket created from Excel test seed.', requester_id, created_at
from tickets where reference like 'MGR-DEMO-%';

insert into ticket_history (ticket_id, action_type, old_value, new_value, comment, performed_by, created_at)
select id, 'ASSIGNED', null, assigned_user_id::text, 'Ticket assigned by Pilote demo.', $managerId, assigned_at
from tickets where reference like 'MGR-DEMO-%' and assigned_user_id is not null;

insert into ticket_history (ticket_id, action_type, old_value, new_value, comment, performed_by, created_at)
select id, 'STATUS_CHANGED', 'ASSIGNED', status, 'Status changed for manager workflow demo.', $managerId, updated_at
from tickets where reference in ('MGR-DEMO-INPROG', 'MGR-DEMO-RISK', 'MGR-DEMO-BREACH', 'MGR-DEMO-VALID');

insert into ticket_history (ticket_id, action_type, old_value, new_value, comment, performed_by, created_at)
select id, 'RESOLVED', 'IN_PROGRESS', 'RESOLVED', 'Resolution submitted by agent.', assigned_user_id, resolved_at
from tickets where reference = 'MGR-DEMO-RESOLVED';

insert into ticket_history (ticket_id, action_type, old_value, new_value, comment, performed_by, created_at)
select id, 'CLOSED', 'RESOLVED', 'CLOSED', 'Resolution validated and ticket closed.', $managerId, closed_at
from tickets where reference = 'MGR-DEMO-CLOSED';

insert into ticket_history (ticket_id, action_type, old_value, new_value, comment, performed_by, created_at)
select id, 'REOPENED', 'RESOLVED', 'REOPENED', 'Resolution insufficient, ticket reopened by Pilote.', $managerId, now() - interval '1 hour'
from tickets where reference = 'MGR-DEMO-REOPEN';

insert into notifications (recipient_user_id, ticket_id, type, title, message, is_read, created_at, read_at)
select $managerId, id, 'TICKET_ASSIGNED', 'MGR-DEMO Nouveau ticket', 'Le ticket ' || reference || ' est pret pour affectation.', false, now() - interval '45 minutes', null
from tickets where reference = 'MGR-DEMO-NEW'
on conflict (recipient_user_id, ticket_id, type) do update set title = excluded.title, message = excluded.message, is_read = false, read_at = null, created_at = excluded.created_at;

insert into notifications (recipient_user_id, ticket_id, type, title, message, is_read, created_at, read_at)
select $managerId, id, 'SLA_AT_RISK', 'MGR-DEMO SLA en risque', 'Le ticket ' || reference || ' approche de son echeance SLA.', false, now() - interval '30 minutes', null
from tickets where reference = 'MGR-DEMO-RISK'
on conflict (recipient_user_id, ticket_id, type) do update set title = excluded.title, message = excluded.message, is_read = false, read_at = null, created_at = excluded.created_at;

insert into notifications (recipient_user_id, ticket_id, type, title, message, is_read, created_at, read_at)
select $managerId, id, 'SLA_BREACHED', 'MGR-DEMO SLA depasse', 'Le ticket ' || reference || ' est en retard SLA.', false, now() - interval '20 minutes', null
from tickets where reference = 'MGR-DEMO-BREACH'
on conflict (recipient_user_id, ticket_id, type) do update set title = excluded.title, message = excluded.message, is_read = false, read_at = null, created_at = excluded.created_at;

insert into notifications (recipient_user_id, ticket_id, type, title, message, is_read, created_at, read_at)
select $managerId, id, 'TICKET_STATUS_UPDATED', 'MGR-DEMO Resolution a valider', 'Le ticket ' || reference || ' attend la validation Pilote.', false, now() - interval '10 minutes', null
from tickets where reference = 'MGR-DEMO-VALID'
on conflict (recipient_user_id, ticket_id, type) do update set title = excluded.title, message = excluded.message, is_read = false, read_at = null, created_at = excluded.created_at;
"@

$riskTicketId = Invoke-DbScalar $env:TICKET_DB_NAME "select id from tickets where reference = 'MGR-DEMO-RISK'"
$validTicketId = Invoke-DbScalar $env:TICKET_DB_NAME "select id from tickets where reference = 'MGR-DEMO-VALID'"

Write-Host "Seeding manager planning week, leave requests, swaps, and planning notifications..."
Invoke-DbSql $env:PLANNING_DB_NAME @"
insert into planning_agents (full_name, email, active, fixed_sco)
values
    ('Abdelilah Saoudi', 'mgr.demo.agent1@cgi.local', true, false),
    ('Ranya Kissami', 'mgr.demo.agent2@cgi.local', true, false),
    ('Fatima Ezzahra Amanne', 'mgr.demo.agent3@cgi.local', true, false),
    ('Othmane Janah', 'mgr.demo.agent4@cgi.local', true, false),
    ('Chaimae El Kadiri', 'mgr.demo.agent5@cgi.local', true, false),
    ('Agent CGI', 'agent@cgi.local', true, false),
    ('Agent B Module 6', 'agentb.module6@cgi.local', true, true)
on conflict (email) do update set
    full_name = excluded.full_name,
    active = true,
    fixed_sco = excluded.fixed_sco;

insert into planning_shifts (code, name, category, start_time, end_time, paid_hours, active)
values
    ('MGR-MATIN', 'Matin manager demo', 'OPENING', '08:00', '16:00', 8, true),
    ('MGR-JOUR', 'Jour manager demo', 'NORMAL', '09:00', '17:00', 8, true),
    ('MGR-SOIR', 'Soir manager demo', 'CLOSING', '12:00', '20:00', 8, true),
    ('MGR-SCO', 'SCO manager demo', 'SCO', '10:00', '18:00', 8, true)
on conflict (code) do update set
    name = excluded.name,
    category = excluded.category,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    paid_hours = excluded.paid_hours,
    active = true;

with weeks(week_start_date) as (
    values (date_trunc('week', current_date)::date), (date_trunc('week', current_date)::date + interval '7 days')
)
insert into planning_weeks (week_start_date, week_end_date, status, generated_at, manually_overridden)
select week_start_date::date, (week_start_date::date + 6), 'PUBLISHED', now(), true
from weeks
on conflict (week_start_date) do update set
    week_end_date = excluded.week_end_date,
    status = 'PUBLISHED',
    generated_at = now(),
    manually_overridden = true;

delete from planning_assignments
where agent_id in (select id from planning_agents where email like 'mgr.demo.agent%@cgi.local' or email in ('agent@cgi.local', 'agentb.module6@cgi.local'))
  and assignment_date between date_trunc('week', current_date)::date and (date_trunc('week', current_date)::date + 13);

with agents as (
    select id, row_number() over (order by email) as rn
    from planning_agents
    where email like 'mgr.demo.agent%@cgi.local' or email in ('agent@cgi.local', 'agentb.module6@cgi.local')
),
days as (
    select generate_series(date_trunc('week', current_date)::date, date_trunc('week', current_date)::date + 6, interval '1 day')::date as day
),
week_row as (
    select id from planning_weeks where week_start_date = date_trunc('week', current_date)::date
),
shifts as (
    select id, code, category, start_time, end_time, paid_hours from planning_shifts where code in ('MGR-MATIN', 'MGR-JOUR', 'MGR-SOIR', 'MGR-SCO')
)
insert into planning_assignments (
    planning_week_id, agent_id, shift_id, shift_code, shift_category,
    assignment_date, start_time, end_time, paid_hours, locked, generated,
    manually_overridden, lateness_minutes
)
select
    week_row.id,
    agents.id,
    shifts.id,
    shifts.code,
    shifts.category,
    days.day,
    shifts.start_time,
    shifts.end_time,
    shifts.paid_hours,
    (extract(dow from days.day)::int in (0, 6)),
    false,
    true,
    case when agents.rn = 2 and extract(dow from days.day)::int = 3 then 15 else 0 end
from agents
cross join days
cross join week_row
join shifts on shifts.code = case
    when extract(dow from days.day)::int in (0, 6) then 'MGR-SCO'
    when agents.rn % 3 = 0 then 'MGR-SOIR'
    when agents.rn % 2 = 0 then 'MGR-JOUR'
    else 'MGR-MATIN'
end
on conflict (planning_week_id, agent_id, assignment_date) do update set
    shift_id = excluded.shift_id,
    shift_code = excluded.shift_code,
    shift_category = excluded.shift_category,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    paid_hours = excluded.paid_hours,
    locked = excluded.locked,
    generated = excluded.generated,
    manually_overridden = excluded.manually_overridden,
    lateness_minutes = excluded.lateness_minutes;

delete from planning_leave_requests
where reason like 'MGR-DEMO%'
  and agent_id in (select id from planning_agents where email like 'mgr.demo.agent%@cgi.local' or email in ('agent@cgi.local', 'agentb.module6@cgi.local'));

insert into planning_leave_requests (agent_id, start_date, end_date, status, reason, created_at)
select id, date_trunc('week', current_date)::date + 2, date_trunc('week', current_date)::date + 3, 'PENDING', 'MGR-DEMO leave request pending manager decision', now() - interval '2 hours'
from planning_agents where email = 'mgr.demo.agent1@cgi.local'
union all
select id, date_trunc('week', current_date)::date + 4, date_trunc('week', current_date)::date + 4, 'APPROVED', 'MGR-DEMO approved leave example', now() - interval '1 day'
from planning_agents where email = 'mgr.demo.agent4@cgi.local'
union all
select id, date_trunc('week', current_date)::date + 5, date_trunc('week', current_date)::date + 5, 'REJECTED', 'MGR-DEMO rejected leave example with reason', now() - interval '3 days'
from planning_agents where email = 'mgr.demo.agent5@cgi.local';

delete from planning_shift_swap_requests
where reason like 'MGR-DEMO%';

insert into planning_shift_swap_requests (requester_agent_id, target_agent_id, requester_date, target_date, status, reason, created_at)
select requester.id, target.id, date_trunc('week', current_date)::date + 1, date_trunc('week', current_date)::date + 2, 'PENDING', 'MGR-DEMO shift swap pending validation', now() - interval '90 minutes'
from planning_agents requester
join planning_agents target on target.email = 'mgr.demo.agent2@cgi.local'
where requester.email = 'mgr.demo.agent1@cgi.local'
union all
select requester.id, target.id, date_trunc('week', current_date)::date + 3, date_trunc('week', current_date)::date + 4, 'REJECTED', 'MGR-DEMO rejected shift swap for availability conflict', now() - interval '2 days'
from planning_agents requester
join planning_agents target on target.email = 'mgr.demo.agent4@cgi.local'
where requester.email = 'mgr.demo.agent3@cgi.local';

delete from agent_unavailability
where reason like 'MGR-DEMO%'
  and agent_id in (select id from planning_agents where email like 'mgr.demo.agent%@cgi.local' or email in ('agent@cgi.local', 'agentb.module6@cgi.local'));

insert into agent_unavailability (agent_id, unavailable_date, reason)
select id, date_trunc('week', current_date)::date + 2, 'MGR-DEMO medical appointment'
from planning_agents where email = 'mgr.demo.agent3@cgi.local';

delete from planning_notifications
where title like 'MGR-DEMO%';

insert into planning_notifications (type, title, message, action_url, target_email, target_role, created_at, read_at)
values
    ('LEAVE_REQUEST', 'MGR-DEMO Demande de conge', 'Une demande de conge attend la decision du Pilote.', '/planning', 'superviseur@cgi.local', null, now() - interval '1 hour', null),
    ('SHIFT_SWAP_REQUEST', 'MGR-DEMO Echange de shift', 'Une demande d echange de shift est en attente.', '/planning', 'superviseur@cgi.local', null, now() - interval '40 minutes', null),
    ('PLANNING_UPDATED', 'MGR-DEMO Planning publie', 'Le planning hebdomadaire demo a ete publie.', '/planning', 'superviseur@cgi.local', null, now() - interval '20 minutes', null);
"@

Write-Host "Seeding manager conversations and unread/urgent messages..."
Invoke-DbSql $env:MESSAGING_DB_NAME @"
delete from messages
where conversation_id in (
    select id from conversations
    where title like 'MGR-DEMO%' or ticket_id in ($riskTicketId, $validTicketId)
);

delete from conversation_participants
where conversation_id in (
    select id from conversations
    where title like 'MGR-DEMO%' or ticket_id in ($riskTicketId, $validTicketId)
);

delete from conversations
where title like 'MGR-DEMO%' or ticket_id in ($riskTicketId, $validTicketId);

with direct_conversation as (
    insert into conversations (type, title, ticket_id, created_by_user_id, created_at, updated_at)
    values ('DIRECT', 'MGR-DEMO Direct Agent SLA', null, $managerId, now() - interval '2 hours', now() - interval '10 minutes')
    returning id
),
group_conversation as (
    insert into conversations (type, title, ticket_id, created_by_user_id, created_at, updated_at)
    values ('GROUP', 'MGR-DEMO Equipe DS Magasin', null, $managerId, now() - interval '3 hours', now() - interval '5 minutes')
    returning id
),
risk_ticket_conversation as (
    insert into conversations (type, title, ticket_id, created_by_user_id, created_at, updated_at)
    values ('TICKET', 'MGR-DEMO Discussion ticket SLA risque', $riskTicketId, $managerId, now() - interval '1 hour', now() - interval '2 minutes')
    returning id
),
valid_ticket_conversation as (
    insert into conversations (type, title, ticket_id, created_by_user_id, created_at, updated_at)
    values ('TICKET', 'MGR-DEMO Validation resolution', $validTicketId, $managerId, now() - interval '50 minutes', now() - interval '1 minute')
    returning id
),
participants as (
    insert into conversation_participants (conversation_id, user_id, joined_at, active, last_read_at)
    select id, $managerId, now() - interval '2 hours', true, now() - interval '1 hour' from direct_conversation
    union all select id, $demoAgent1Id, now() - interval '2 hours', true, now() - interval '5 minutes' from direct_conversation
    union all select id, $managerId, now() - interval '3 hours', true, now() - interval '2 hours' from group_conversation
    union all select id, $demoAgent1Id, now() - interval '3 hours', true, now() - interval '2 hours' from group_conversation
    union all select id, $demoAgent2Id, now() - interval '3 hours', true, now() - interval '2 hours' from group_conversation
    union all select id, $demoAgent3Id, now() - interval '3 hours', true, now() - interval '2 hours' from group_conversation
    union all select id, $managerId, now() - interval '1 hour', true, now() - interval '45 minutes' from risk_ticket_conversation
    union all select id, $agent2Id, now() - interval '1 hour', true, now() - interval '15 minutes' from risk_ticket_conversation
    union all select id, $managerId, now() - interval '50 minutes', true, null from valid_ticket_conversation
    union all select id, $demoAgent1Id, now() - interval '50 minutes', true, now() - interval '5 minutes' from valid_ticket_conversation
    returning conversation_id
)
insert into messages (conversation_id, sender_user_id, content, urgent, created_at, edited_at, deleted_at)
select id, $managerId, 'Merci de prioriser le ticket SLA en risque avant la fin du shift.', false, now() - interval '55 minutes', null::timestamp, null::timestamp from direct_conversation
union all select id, $demoAgent1Id, 'Diagnostic en cours, je remonte le detail dans 10 minutes.', true, now() - interval '10 minutes', null::timestamp, null::timestamp from direct_conversation
union all select id, $managerId, 'Point equipe: verifiez les tickets MGR-DEMO-RISK et MGR-DEMO-BREACH.', true, now() - interval '35 minutes', null::timestamp, null::timestamp from group_conversation
union all select id, $demoAgent2Id, 'Je prends la verification METI et la categorisation.', false, now() - interval '5 minutes', null::timestamp, null::timestamp from group_conversation
union all select id, $agent2Id, 'Le fournisseur n a pas encore confirme, SLA en risque.', true, now() - interval '2 minutes', null::timestamp, null::timestamp from risk_ticket_conversation
union all select id, $demoAgent1Id, 'Resolution proposee: diagnostic complete et actions documentees.', false, now() - interval '1 minute', null::timestamp, null::timestamp from valid_ticket_conversation;
"@

Write-Host ""
Write-Host "Manager demo data is ready."
Write-Host "Login as superviseur@cgi.local and test: dashboard, team agents, ticket filters/status/SLA, conversations, notifications, and planning requests."
Write-Host "Rerun with -SkipExcelImport to refresh only the manager demo rows:"
Write-Host "  .\scripts\seed-manager-demo-data.ps1 -SkipExcelImport"
