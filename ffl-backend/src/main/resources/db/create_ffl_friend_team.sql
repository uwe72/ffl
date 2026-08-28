CREATE TABLE IF NOT EXISTS ffl_friend_team (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES ffl_user(id),
    season_id BIGINT NOT NULL REFERENCES ffl_season(id),
    friend_manager_id BIGINT NOT NULL REFERENCES ffl_manager(id),
    position INTEGER NOT NULL DEFAULT 0,
    is_standard BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uk_friend_team_owner_season_manager UNIQUE (owner_user_id, season_id, friend_manager_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_friend_team_one_standard_per_season
    ON ffl_friend_team (owner_user_id, season_id)
    WHERE is_standard;
