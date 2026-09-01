-- Widen matchday_mail_prompt from varchar(4000) to TEXT (unlimited) so long LLM prompts can be saved.
-- Run manually on the database; Hibernate ddl-auto:update does not alter existing column types.
ALTER TABLE ffl_system_config ALTER COLUMN matchday_mail_prompt TYPE TEXT;
