-- Backfill the admin fallback user login for existing seasons.
-- Run manually after the admin_fallback_user column has been created by Hibernate ddl-auto:update.
UPDATE ffl_season SET admin_fallback_user = 'uwe72' WHERE admin_fallback_user IS NULL;
