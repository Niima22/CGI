ALTER TABLE planning_shifts DROP CONSTRAINT IF EXISTS ck_planning_shifts_category;
ALTER TABLE planning_shifts
    ADD CONSTRAINT ck_planning_shifts_category
    CHECK (category IN ('OPENING', 'NORMAL', 'CLOSING'));

ALTER TABLE planning_assignments DROP CONSTRAINT IF EXISTS ck_planning_assignments_category;
ALTER TABLE planning_assignments
    ADD CONSTRAINT ck_planning_assignments_category
    CHECK (shift_category IN ('OPENING', 'NORMAL', 'CLOSING'));

INSERT INTO planning_shifts (code, name, category, start_time, end_time, paid_hours, active) VALUES
('NORMAL_05_14', 'Normal 05:00-14:00', 'NORMAL', '05:00', '14:00', 8, TRUE),
('NORMAL_07_16', 'Normal 07:00-16:00', 'NORMAL', '07:00', '16:00', 8, TRUE),
('NORMAL_08_17', 'Normal 08:00-17:00', 'NORMAL', '08:00', '17:00', 8, TRUE),
('NORMAL_09_18', 'Normal 09:00-18:00', 'NORMAL', '09:00', '18:00', 8, TRUE);

CREATE UNIQUE INDEX IF NOT EXISTS uk_planning_assignment_agent_day
    ON planning_assignments(agent_id, assignment_date);
