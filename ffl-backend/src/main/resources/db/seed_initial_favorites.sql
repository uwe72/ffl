INSERT INTO ffl_friend_team (owner_user_id, season_id, friend_manager_id, position, is_standard)
SELECT m.user_id, m.season_id, m.id, 0, false
FROM ffl_manager m
WHERE NOT EXISTS (
    SELECT 1 FROM ffl_friend_team ft
    WHERE ft.owner_user_id = m.user_id
      AND ft.season_id = m.season_id
      AND ft.friend_manager_id = m.id
);
