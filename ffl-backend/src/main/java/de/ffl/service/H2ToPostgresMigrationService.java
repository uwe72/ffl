package de.ffl.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class H2ToPostgresMigrationService {

    private static final Logger log = LoggerFactory.getLogger(H2ToPostgresMigrationService.class);

    private final JdbcTemplate h2JdbcTemplate;
    private final JdbcTemplate postgresJdbcTemplate;

    @Autowired
    public H2ToPostgresMigrationService(
            @Qualifier("h2JdbcTemplate") JdbcTemplate h2JdbcTemplate,
            @Qualifier("postgresJdbcTemplate") JdbcTemplate postgresJdbcTemplate) {
        this.h2JdbcTemplate = h2JdbcTemplate;
        this.postgresJdbcTemplate = postgresJdbcTemplate;
    }

    public boolean isH2Available() {
        try {
            h2JdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (Exception e) {
            log.warn("H2 database not available: {}", e.getMessage());
            return false;
        }
    }

    public boolean hasPostgresData() {
        try {
            Integer count = postgresJdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ffl_user", Integer.class);
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public MigrationResult migrateAll(boolean clearExisting) {
        MigrationResult result = new MigrationResult();

        if (!isH2Available()) {
            result.errors.add("H2 database not available");
            return result;
        }

        if (hasPostgresData() && !clearExisting) {
            result.errors.add("PostgreSQL already contains data. Use force=true to overwrite.");
            return result;
        }

        try {
            clearPostgresTables();
            migrateUsers(result);
            migrateTeams(result);
            migrateSeasons(result);
            migratePlayers(result);
            migrateManagers(result);
            migrateRounds(result);
            migrateGames(result);
            migratePoints(result);
            migratePlayerRanks(result);
            migrateManagerRanks(result);
            migrateManagerGroups(result);
            migrateManagerGroupMembers(result);
            migrateManagerPlayers(result);
            migrateSeasonTeams(result);
            resetSequences(result);
        } catch (Exception e) {
            log.error("Migration failed", e);
            result.errors.add("Migration failed: " + e.getMessage());
        }

        return result;
    }

    private void clearPostgresTables() {
        log.info("Clearing PostgreSQL tables...");
        try {
            postgresJdbcTemplate.execute("SET CONSTRAINTS ALL DEFERRED");
            
            String[] tables = {
                "manager_2_player",
                "manager_group_2_manager", 
                "season_2_team",
                "game_2_players_host",
                "game_2_players_visitor",
                "ffl_points",
                "ffl_player_rank",
                "ffl_manager_rank",
                "ffl_manager_group",
                "ffl_game",
                "ffl_round",
                "ffl_manager",
                "ffl_player",
                "ffl_season",
                "ffl_team",
                "ffl_user"
            };
            
            for (String table : tables) {
                try {
                    int deleted = postgresJdbcTemplate.update("DELETE FROM " + table);
                    log.debug("Deleted {} rows from {}", deleted, table);
                } catch (Exception e) {
                    log.debug("Could not delete from {}: {}", table, e.getMessage());
                }
            }
            
            postgresJdbcTemplate.execute("SET CONSTRAINTS ALL IMMEDIATE");
            log.info("PostgreSQL tables cleared");
        } catch (Exception e) {
            log.error("Error clearing tables: {}", e.getMessage());
        }
    }

    private void migrateUsers(MigrationResult result) {
        log.info("Migrating users...");
        try {
            List<Map<String, Object>> users = h2JdbcTemplate.queryForList(
                "SELECT id, login, password, email, first_name, last_name, street, city, birthday, role FROM ffl_user");
            
            for (Map<String, Object> user : users) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_user (id, login, password, email, first_name, last_name, street, city, birthday, role) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    user.get("id"),
                    user.get("login"),
                    user.get("password"),
                    user.get("email"),
                    user.get("first_name"),
                    user.get("last_name"),
                    user.get("street"),
                    user.get("city"),
                    user.get("birthday"),
                    user.get("role")
                );
            }
            result.usersMigrated = users.size();
            log.info("Migrated {} users", result.usersMigrated);
        } catch (Exception e) {
            log.error("Error migrating users", e);
            result.errors.add("Users: " + e.getMessage());
        }
    }

    private void migrateTeams(MigrationResult result) {
        log.info("Migrating teams...");
        try {
            List<Map<String, Object>> teams = h2JdbcTemplate.queryForList(
                "SELECT id, name, short_name, logo_xxl_url, logosurl FROM ffl_team");
            
            for (Map<String, Object> team : teams) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_team (id, name, short_name, logo_xxl_url, logosurl) VALUES (?, ?, ?, ?, ?)",
                    team.get("id"),
                    team.get("name"),
                    team.get("short_name"),
                    team.get("logo_xxl_url"),
                    team.get("logosurl")
                );
            }
            result.teamsMigrated = teams.size();
            log.info("Migrated {} teams", result.teamsMigrated);
        } catch (Exception e) {
            log.error("Error migrating teams", e);
            result.errors.add("Teams: " + e.getMessage());
        }
    }

    private void migrateSeasons(MigrationResult result) {
        log.info("Migrating seasons...");
        try {
            List<Map<String, Object>> seasons = h2JdbcTemplate.queryForList(
                "SELECT id, name, budget, season_state, final_registration_date, start_round_rueckrunde, current_matchday FROM ffl_season");
            
            for (Map<String, Object> season : seasons) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_season (id, name, budget, season_state, final_registration_date, start_round_rueckrunde, current_matchday) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    season.get("id"),
                    season.get("name"),
                    season.get("budget"),
                    season.get("season_state"),
                    season.get("final_registration_date"),
                    season.get("start_round_rueckrunde"),
                    season.get("current_matchday")
                );
            }
            result.seasonsMigrated = seasons.size();
            log.info("Migrated {} seasons", result.seasonsMigrated);
        } catch (Exception e) {
            log.error("Error migrating seasons", e);
            result.errors.add("Seasons: " + e.getMessage());
        }
    }

    private void migratePlayers(MigrationResult result) {
        log.info("Migrating players...");
        try {
            List<Map<String, Object>> players = h2JdbcTemplate.queryForList(
                "SELECT id, name_kicker, name_kicker_alt1, name_kicker_alt2, name_kicker_alt3, first_name, last_name, position, prize, picture_url, season_id FROM ffl_player");
            
            for (Map<String, Object> player : players) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_player (id, name_kicker, name_kicker_alt1, name_kicker_alt2, name_kicker_alt3, first_name, last_name, position, prize, picture_url, season_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    player.get("id"),
                    player.get("name_kicker"),
                    player.get("name_kicker_alt1"),
                    player.get("name_kicker_alt2"),
                    player.get("name_kicker_alt3"),
                    player.get("first_name"),
                    player.get("last_name"),
                    player.get("position"),
                    player.get("prize"),
                    player.get("picture_url"),
                    player.get("season_id")
                );
            }
            result.playersMigrated = players.size();
            log.info("Migrated {} players", result.playersMigrated);
        } catch (Exception e) {
            log.error("Error migrating players", e);
            result.errors.add("Players: " + e.getMessage());
        }
    }

    private void migrateManagers(MigrationResult result) {
        log.info("Migrating managers...");
        try {
            List<Map<String, Object>> managers = h2JdbcTemplate.queryForList(
                "SELECT id, name, short_name, budget, payment_state, description, season_id, user_id, " +
                "player_goalkeeper_id, player_defender1_id, player_defender2_id, player_defender3_id, " +
                "player_midfield1_id, player_midfield2_id, player_midfield3_id, " +
                "player_striker1_id, player_striker2_id, player_striker3_id, " +
                "player_free_choice_id, " +
                "player_exchanged_old1_id, player_exchanged_old2_id, player_exchanged_old3_id, " +
                "player_exchanged_new1_id, player_exchanged_new2_id, player_exchanged_new3_id " +
                "FROM ffl_manager");
            
            for (Map<String, Object> manager : managers) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_manager (id, name, short_name, budget, payment_state, description, season_id, user_id, " +
                    "player_goalkeeper_id, player_defender1_id, player_defender2_id, player_defender3_id, " +
                    "player_midfield1_id, player_midfield2_id, player_midfield3_id, " +
                    "player_striker1_id, player_striker2_id, player_striker3_id, " +
                    "player_free_choice_id, " +
                    "player_exchanged_old1_id, player_exchanged_old2_id, player_exchanged_old3_id, " +
                    "player_exchanged_new1_id, player_exchanged_new2_id, player_exchanged_new3_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    manager.get("id"),
                    manager.get("name"),
                    manager.get("short_name"),
                    manager.get("budget"),
                    manager.get("payment_state"),
                    manager.get("description"),
                    manager.get("season_id"),
                    manager.get("user_id"),
                    manager.get("player_goalkeeper_id"),
                    manager.get("player_defender1_id"),
                    manager.get("player_defender2_id"),
                    manager.get("player_defender3_id"),
                    manager.get("player_midfield1_id"),
                    manager.get("player_midfield2_id"),
                    manager.get("player_midfield3_id"),
                    manager.get("player_striker1_id"),
                    manager.get("player_striker2_id"),
                    manager.get("player_striker3_id"),
                    manager.get("player_free_choice_id"),
                    manager.get("player_exchanged_old1_id"),
                    manager.get("player_exchanged_old2_id"),
                    manager.get("player_exchanged_old3_id"),
                    manager.get("player_exchanged_new1_id"),
                    manager.get("player_exchanged_new2_id"),
                    manager.get("player_exchanged_new3_id")
                );
            }
            result.managersMigrated = managers.size();
            log.info("Migrated {} managers", result.managersMigrated);
        } catch (Exception e) {
            log.error("Error migrating managers", e);
            result.errors.add("Managers: " + e.getMessage());
        }
    }

    private void migrateRounds(MigrationResult result) {
        log.info("Migrating rounds...");
        try {
            List<Map<String, Object>> rounds = h2JdbcTemplate.queryForList(
                "SELECT id, number, season_id FROM ffl_round");
            
            for (Map<String, Object> round : rounds) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_round (id, number, season_id) VALUES (?, ?, ?)",
                    round.get("id"),
                    round.get("number"),
                    round.get("season_id")
                );
            }
            result.roundsMigrated = rounds.size();
            log.info("Migrated {} rounds", result.roundsMigrated);
        } catch (Exception e) {
            log.error("Error migrating rounds", e);
            result.errors.add("Rounds: " + e.getMessage());
        }
    }

    private void migrateGames(MigrationResult result) {
        log.info("Migrating games...");
        try {
            List<Map<String, Object>> games = h2JdbcTemplate.queryForList(
                "SELECT id, name, host_id, visitor_id, goal_host, goal_visitor, round_id FROM ffl_game");
            
            for (Map<String, Object> game : games) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_game (id, name, host_id, visitor_id, goal_host, goal_visitor, round_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    game.get("id"),
                    game.get("name"),
                    game.get("host_id"),
                    game.get("visitor_id"),
                    game.get("goal_host"),
                    game.get("goal_visitor"),
                    game.get("round_id")
                );
            }
            result.gamesMigrated = games.size();
            log.info("Migrated {} games", result.gamesMigrated);
        } catch (Exception e) {
            log.error("Error migrating games", e);
            result.errors.add("Games: " + e.getMessage());
        }
    }

    private void migratePoints(MigrationResult result) {
        log.info("Migrating points...");
        try {
            List<Map<String, Object>> points = h2JdbcTemplate.queryForList(
                "SELECT id, number, rule, game_id, player_id FROM ffl_points");
            
            for (Map<String, Object> point : points) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_points (id, number, rule, game_id, player_id) VALUES (?, ?, ?, ?, ?)",
                    point.get("id"),
                    point.get("number"),
                    point.get("rule"),
                    point.get("game_id"),
                    point.get("player_id")
                );
            }
            result.pointsMigrated = points.size();
            log.info("Migrated {} points", result.pointsMigrated);
        } catch (Exception e) {
            log.error("Error migrating points", e);
            result.errors.add("Points: " + e.getMessage());
        }
    }

    private void migratePlayerRanks(MigrationResult result) {
        log.info("Migrating player ranks...");
        try {
            List<Map<String, Object>> playerRanks = h2JdbcTemplate.queryForList(
                "SELECT id, number_matches, played, points_round, points_total, position_round, position_total, player_id, round_id FROM ffl_player_rank");
            
            for (Map<String, Object> playerRank : playerRanks) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_player_rank (id, number_matches, played, points_round, points_total, position_round, position_total, player_id, round_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    playerRank.get("id"),
                    playerRank.get("number_matches"),
                    playerRank.get("played"),
                    playerRank.get("points_round"),
                    playerRank.get("points_total"),
                    playerRank.get("position_round"),
                    playerRank.get("position_total"),
                    playerRank.get("player_id"),
                    playerRank.get("round_id")
                );
            }
            result.playerRanksMigrated = playerRanks.size();
            log.info("Migrated {} player ranks", result.playerRanksMigrated);
        } catch (Exception e) {
            log.error("Error migrating player ranks", e);
            result.errors.add("PlayerRanks: " + e.getMessage());
        }
    }

    private void migrateManagerRanks(MigrationResult result) {
        log.info("Migrating manager ranks...");
        try {
            List<Map<String, Object>> managerRanks = h2JdbcTemplate.queryForList(
                "SELECT id, points_round, points_total, position_round, position_total, manager_id, round_id FROM ffl_manager_rank");
            
            for (Map<String, Object> managerRank : managerRanks) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_manager_rank (id, points_round, points_total, position_round, position_total, manager_id, round_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    managerRank.get("id"),
                    managerRank.get("points_round"),
                    managerRank.get("points_total"),
                    managerRank.get("position_round"),
                    managerRank.get("position_total"),
                    managerRank.get("manager_id"),
                    managerRank.get("round_id")
                );
            }
            result.managerRanksMigrated = managerRanks.size();
            log.info("Migrated {} manager ranks", result.managerRanksMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager ranks", e);
            result.errors.add("ManagerRanks: " + e.getMessage());
        }
    }

    private void migrateManagerGroups(MigrationResult result) {
        log.info("Migrating manager groups...");
        try {
            List<Map<String, Object>> managerGroups = h2JdbcTemplate.queryForList(
                "SELECT id, name, description, season_id FROM ffl_manager_group");
            
            for (Map<String, Object> managerGroup : managerGroups) {
                postgresJdbcTemplate.update(
                    "INSERT INTO ffl_manager_group (id, name, description, season_id) VALUES (?, ?, ?, ?)",
                    managerGroup.get("id"),
                    managerGroup.get("name"),
                    managerGroup.get("description"),
                    managerGroup.get("season_id")
                );
            }
            result.managerGroupsMigrated = managerGroups.size();
            log.info("Migrated {} manager groups", result.managerGroupsMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager groups", e);
            result.errors.add("ManagerGroups: " + e.getMessage());
        }
    }

    private void migrateManagerGroupMembers(MigrationResult result) {
        log.info("Migrating manager group members...");
        try {
            List<Map<String, Object>> members = h2JdbcTemplate.queryForList(
                "SELECT manager_group_id, manager_id FROM manager_group_2_manager");
            
            for (Map<String, Object> member : members) {
                postgresJdbcTemplate.update(
                    "INSERT INTO manager_group_2_manager (manager_group_id, manager_id) VALUES (?, ?)",
                    member.get("manager_group_id"),
                    member.get("manager_id")
                );
            }
            result.managerGroupMembersMigrated = members.size();
            log.info("Migrated {} manager group members", result.managerGroupMembersMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager group members", e);
            result.errors.add("ManagerGroupMembers: " + e.getMessage());
        }
    }

    private void migrateManagerPlayers(MigrationResult result) {
        log.info("Migrating manager players...");
        try {
            List<Map<String, Object>> managerPlayers = h2JdbcTemplate.queryForList(
                "SELECT manager_id, player_id FROM manager_2_player");
            
            for (Map<String, Object> mp : managerPlayers) {
                postgresJdbcTemplate.update(
                    "INSERT INTO manager_2_player (manager_id, player_id) VALUES (?, ?)",
                    mp.get("manager_id"),
                    mp.get("player_id")
                );
            }
            result.managerPlayersMigrated = managerPlayers.size();
            log.info("Migrated {} manager player relations", result.managerPlayersMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager players", e);
            result.errors.add("ManagerPlayers: " + e.getMessage());
        }
    }

    private void migrateSeasonTeams(MigrationResult result) {
        log.info("Migrating season teams...");
        try {
            List<Map<String, Object>> seasonTeams = h2JdbcTemplate.queryForList(
                "SELECT season_id, team_id FROM season_2_team");
            
            for (Map<String, Object> st : seasonTeams) {
                postgresJdbcTemplate.update(
                    "INSERT INTO season_2_team (season_id, team_id) VALUES (?, ?)",
                    st.get("season_id"),
                    st.get("team_id")
                );
            }
            result.seasonTeamsMigrated = seasonTeams.size();
            log.info("Migrated {} season team relations", result.seasonTeamsMigrated);
        } catch (Exception e) {
            log.error("Error migrating season teams", e);
            result.errors.add("SeasonTeams: " + e.getMessage());
        }
    }

    private void resetSequences(MigrationResult result) {
        log.info("Resetting sequences...");
        try {
            String[] tables = {
                "ffl_user", "ffl_team", "ffl_season", "ffl_player", "ffl_manager",
                "ffl_round", "ffl_game", "ffl_points", "ffl_player_rank", "ffl_manager_rank",
                "ffl_manager_group"
            };
            
            for (String table : tables) {
                String sequenceName = table + "_seq";
                try {
                    Integer maxId = postgresJdbcTemplate.queryForObject(
                        "SELECT COALESCE(MAX(id), 0) FROM " + table, Integer.class);
                    if (maxId != null && maxId > 0) {
                        postgresJdbcTemplate.execute(
                            "SELECT setval('" + sequenceName + "', " + maxId + ", true)");
                    }
                } catch (Exception e) {
                    log.debug("Sequence reset skipped for {}: {}", table, e.getMessage());
                }
            }
            log.info("Sequences reset");
        } catch (Exception e) {
            log.error("Error resetting sequences", e);
            result.errors.add("Sequences: " + e.getMessage());
        }
    }

    public static class MigrationResult {
        public int usersMigrated = 0;
        public int teamsMigrated = 0;
        public int seasonsMigrated = 0;
        public int playersMigrated = 0;
        public int managersMigrated = 0;
        public int roundsMigrated = 0;
        public int gamesMigrated = 0;
        public int pointsMigrated = 0;
        public int playerRanksMigrated = 0;
        public int managerRanksMigrated = 0;
        public int managerGroupsMigrated = 0;
        public int managerGroupMembersMigrated = 0;
        public int managerPlayersMigrated = 0;
        public int seasonTeamsMigrated = 0;
        public List<String> errors = new ArrayList<>();

        @Override
        public String toString() {
            return "MigrationResult{" +
                "users=" + usersMigrated +
                ", teams=" + teamsMigrated +
                ", seasons=" + seasonsMigrated +
                ", players=" + playersMigrated +
                ", managers=" + managersMigrated +
                ", rounds=" + roundsMigrated +
                ", games=" + gamesMigrated +
                ", points=" + pointsMigrated +
                ", playerRanks=" + playerRanksMigrated +
                ", managerRanks=" + managerRanksMigrated +
                ", managerGroups=" + managerGroupsMigrated +
                ", managerGroupMembers=" + managerGroupMembersMigrated +
                ", managerPlayers=" + managerPlayersMigrated +
                ", seasonTeams=" + seasonTeamsMigrated +
                ", errors=" + errors +
                '}';
        }
    }
}