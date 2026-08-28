CREATE UNIQUE INDEX IF NOT EXISTS ux_ffl_user_login_lower ON ffl_user (LOWER(login));
