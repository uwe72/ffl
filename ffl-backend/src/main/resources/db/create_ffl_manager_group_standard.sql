-- Run manually on the database; Hibernate ddl-auto:update creates the table but not partial unique indexes.
-- Enforces at most one standard group per owner user.
CREATE UNIQUE INDEX IF NOT EXISTS uk_manager_group_standard_one_per_user
    ON ffl_manager_group_standard (owner_user_id);
