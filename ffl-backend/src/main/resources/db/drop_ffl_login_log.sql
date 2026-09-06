-- Run manually on the database; Hibernate ddl-auto:update does not drop tables.
-- Entfernt die veraltete Login-Erfassung (ersatzweise durch ffl_visit_log ersetzt).
DROP TABLE IF EXISTS ffl_login_log;
