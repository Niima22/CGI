ALTER TABLE planning_assignments
    ADD COLUMN lateness_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE planning_assignments
    ADD CONSTRAINT ck_planning_assignments_lateness
    CHECK (lateness_minutes >= 0);
