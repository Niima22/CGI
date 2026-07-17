ALTER TABLE planning_agents
    ADD COLUMN IF NOT EXISTS fixed_sco BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE planning_shifts DROP CONSTRAINT IF EXISTS ck_planning_shifts_category;
ALTER TABLE planning_shifts
    ADD CONSTRAINT ck_planning_shifts_category
    CHECK (category IN ('OPENING', 'NORMAL', 'CLOSING', 'SCO'));

ALTER TABLE planning_assignments DROP CONSTRAINT IF EXISTS ck_planning_assignments_category;
ALTER TABLE planning_assignments
    ADD CONSTRAINT ck_planning_assignments_category
    CHECK (shift_category IN ('OPENING', 'NORMAL', 'CLOSING', 'SCO'));

INSERT INTO planning_shifts (code, name, category, start_time, end_time, paid_hours, active)
VALUES ('SCO_11_20', 'SCO 11:00-20:00', 'SCO', '11:00', '20:00', 8, TRUE)
ON CONFLICT (code) DO NOTHING;

UPDATE planning_agents SET fixed_sco = TRUE WHERE email = 'agent01@test.com';

INSERT INTO planning_agents (full_name, email, active, fixed_sco) VALUES
('Agent 09', 'agent09@test.com', TRUE, FALSE),
('Agent 10', 'agent10@test.com', TRUE, FALSE),
('Agent 11', 'agent11@test.com', TRUE, FALSE),
('Agent 12', 'agent12@test.com', TRUE, FALSE)
ON CONFLICT (email) DO NOTHING;
