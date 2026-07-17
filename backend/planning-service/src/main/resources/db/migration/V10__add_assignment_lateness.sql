ALTER TABLE planning_assignments
    ADD COLUMN IF NOT EXISTS lateness_minutes INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_planning_assignments_lateness'
    ) THEN
        ALTER TABLE planning_assignments
            ADD CONSTRAINT ck_planning_assignments_lateness
            CHECK (lateness_minutes >= 0);
    END IF;
END $$;
