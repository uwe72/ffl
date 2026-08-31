-- Migrate existing short_name content (currently used as team slogan) to the new slogan column.
-- Run manually after the slogan column has been created by Hibernate ddl-auto:update.
UPDATE ffl_team SET slogan = short_name;
UPDATE ffl_team SET short_name = NULL;
