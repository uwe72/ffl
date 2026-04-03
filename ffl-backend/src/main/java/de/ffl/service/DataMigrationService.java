package de.ffl.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.List;

@Service
public class DataMigrationService {

    private static final Logger log = LoggerFactory.getLogger(DataMigrationService.class);

    private final EntityManager entityManager;

    public DataMigrationService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Transactional
    public MigrationResult migrateAll() {
        MigrationResult result = new MigrationResult();
        
        clearAllTables();
        
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
        
        return result;
    }

    private void clearAllTables() {
        log.info("Clearing all tables...");
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();
        
        entityManager.createNativeQuery("DELETE FROM manager_2_player").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM manager_group_2_manager").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM season_2_team").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM game_2_players_host").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM game_2_players_visitor").executeUpdate();
        
        entityManager.createNativeQuery("DELETE FROM ffl_points").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_player_rank").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_manager_rank").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_manager_group").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_game").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_round").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_manager").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_player").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_season").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_team").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_user").executeUpdate();
        
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();
        log.info("Tables cleared");
    }

    private void migrateUsers(MigrationResult result) {
        log.info("Migrating users...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_user (id, login, password, email, first_name, last_name, street, city, birthday, role) " +
                "SELECT ID, LOGIN, COALESCE(PASSWORD, 'password'), " +
                "COALESCE(EMAIL, CONCAT('user', ID, '@example.com')), " +
                "FIRST_NAME, LAST_NAME, STREET, CITY, BIRTHDAY, " +
                "CASE user_role WHEN 0 THEN 'ADMIN' WHEN 1 THEN 'NORMAL' ELSE 'GUEST' END " +
                "FROM FFL_USER"
            ).executeUpdate();
            result.usersMigrated = countRows("ffl_user");
            log.info("Migrated {} users", result.usersMigrated);
        } catch (Exception e) {
            log.error("Error migrating users", e);
            result.errors.add("Users: " + e.getMessage());
        }
    }

    private void migrateTeams(MigrationResult result) {
        log.info("Migrating teams...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_team (id, name, short_name, logo_xxl_url, logosurl) " +
                "SELECT ID, Name, Short_Name, LogoXxlUrl, LogoSUrl FROM FFL_TEAM"
            ).executeUpdate();
            result.teamsMigrated = countRows("ffl_team");
            log.info("Migrated {} teams", result.teamsMigrated);
        } catch (Exception e) {
            log.error("Error migrating teams", e);
            result.errors.add("Teams: " + e.getMessage());
        }
    }

    private void migrateSeasons(MigrationResult result) {
        log.info("Migrating seasons...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_season (id, name, budget, season_state, final_registration_date) " +
                "SELECT ID, Name, COALESCE(Budget, 150), " +
                "CASE season_state WHEN 0 THEN 'BEFORE_SEASON' WHEN 1 THEN 'RUNNING_HINRUNDE' ELSE 'RUNNING_RUECKRUNDE' END, " +
                "STR_TO_DATE(FinalRegistrationDate, '%d.%m.%Y') FROM FFL_SEASON"
            ).executeUpdate();
            result.seasonsMigrated = countRows("ffl_season");
            log.info("Migrated {} seasons", result.seasonsMigrated);
        } catch (Exception e) {
            log.error("Error migrating seasons", e);
            result.errors.add("Seasons: " + e.getMessage());
        }
    }

    private void migratePlayers(MigrationResult result) {
        log.info("Migrating players...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_player (id, name_kicker, first_name, last_name, position, prize, picture_url, team_id, season_id) " +
                "SELECT ID, COALESCE(Name_Kicker, CONCAT(Vorname, ' ', Nachname)), Vorname, Nachname, " +
                "CASE player_position WHEN 0 THEN 'GOALKEEPER' WHEN 1 THEN 'DEFENDER' WHEN 2 THEN 'MIDFIELD' ELSE 'STRIKER' END, " +
                "COALESCE(Prize, 0), PictureUrl, TEAM_ID, SEASON_ID FROM FFL_PLAYER"
            ).executeUpdate();
            result.playersMigrated = countRows("ffl_player");
            log.info("Migrated {} players", result.playersMigrated);
        } catch (Exception e) {
            log.error("Error migrating players", e);
            result.errors.add("Players: " + e.getMessage());
        }
    }

    private void migrateManagers(MigrationResult result) {
        log.info("Migrating managers...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_manager (id, name, short_name, budget, payment_state, description, season_id, user_id, " +
                "player_exchanged_old1_id, player_exchanged_old2_id, player_exchanged_old3_id, " +
                "player_exchanged_new1_id, player_exchanged_new2_id, player_exchanged_new3_id) " +
                "SELECT ID, CONCAT(COALESCE(FIRST_NAME, ''), ' ', COALESCE(LAST_NAME, '')), LOGIN, " +
                "COALESCE(Budget, 0), CASE payment WHEN 0 THEN 'NOT_PAID' ELSE 'PAID' END, " +
                "DESCRIPTION, SEASON_ID, USER_ID, " +
                "PLAYER_EXCHANGED_OLD1, PLAYER_EXCHANGED_OLD2, PLAYER_EXCHANGED_OLD3, " +
                "PLAYER_EXCHANGED_NEW1, PLAYER_EXCHANGED_NEW2, PLAYER_EXCHANGED_NEW3 FROM FFL_MANAGER"
            ).executeUpdate();
            result.managersMigrated = countRows("ffl_manager");
            log.info("Migrated {} managers", result.managersMigrated);
        } catch (Exception e) {
            log.error("Error migrating managers", e);
            result.errors.add("Managers: " + e.getMessage());
        }
    }

    private void migrateRounds(MigrationResult result) {
        log.info("Migrating rounds...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_round (id, number, season_id) " +
                "SELECT ID, Number, SEASON_ID FROM FFL_ROUND"
            ).executeUpdate();
            result.roundsMigrated = countRows("ffl_round");
            log.info("Migrated {} rounds", result.roundsMigrated);
        } catch (Exception e) {
            log.error("Error migrating rounds", e);
            result.errors.add("Rounds: " + e.getMessage());
        }
    }

    private void migrateGames(MigrationResult result) {
        log.info("Migrating games...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_game (id, name, host_id, visitor_id, goal_host, goal_visitor, round_id) " +
                "SELECT ID, Name, HOST_ID, VISITOR_ID, GoalHost, GoalVisitor, ROUND_ID FROM FFL_GAME"
            ).executeUpdate();
            result.gamesMigrated = countRows("ffl_game");
            log.info("Migrated {} games", result.gamesMigrated);
        } catch (Exception e) {
            log.error("Error migrating games", e);
            result.errors.add("Games: " + e.getMessage());
        }
    }

    private void migratePoints(MigrationResult result) {
        log.info("Migrating points...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_points (id, number, rule, game_id, player_id) " +
                "SELECT ID, Number, Rule, GAME_ID, PLAYER_ID FROM FFL_POINTS"
            ).executeUpdate();
            result.pointsMigrated = countRows("ffl_points");
            log.info("Migrated {} points", result.pointsMigrated);
        } catch (Exception e) {
            log.error("Error migrating points", e);
            result.errors.add("Points: " + e.getMessage());
        }
    }

    private void migratePlayerRanks(MigrationResult result) {
        log.info("Migrating player ranks...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_player_rank (id, number_matches, played, points_round, points_total, position_round, position_total, player_id, round_id) " +
                "SELECT ID, Number_Matches, Played, Points_Round, Points_Total, Position_Round, Position_Total, PLAYER_ID, ROUND_ID FROM FFL_PLAYER_RANK"
            ).executeUpdate();
            result.playerRanksMigrated = countRows("ffl_player_rank");
            log.info("Migrated {} player ranks", result.playerRanksMigrated);
        } catch (Exception e) {
            log.error("Error migrating player ranks", e);
            result.errors.add("PlayerRanks: " + e.getMessage());
        }
    }

    private void migrateManagerRanks(MigrationResult result) {
        log.info("Migrating manager ranks...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_manager_rank (id, points_round, points_total, position_round, position_total, manager_id, round_id) " +
                "SELECT ID, Points_Round, Points_Total, Position_Round, Position_Total, MANAGER_ID, ROUND_ID FROM FFL_MANAGER_RANK"
            ).executeUpdate();
            result.managerRanksMigrated = countRows("ffl_manager_rank");
            log.info("Migrated {} manager ranks", result.managerRanksMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager ranks", e);
            result.errors.add("ManagerRanks: " + e.getMessage());
        }
    }

    private void migrateManagerGroups(MigrationResult result) {
        log.info("Migrating manager groups...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_manager_group (id, name, description, season_id) " +
                "SELECT ID, Name, Description, SEASON_ID FROM FFL_MANAGER_GROUP"
            ).executeUpdate();
            result.managerGroupsMigrated = countRows("ffl_manager_group");
            log.info("Migrated {} manager groups", result.managerGroupsMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager groups", e);
            result.errors.add("ManagerGroups: " + e.getMessage());
        }
    }

    private void migrateManagerGroupMembers(MigrationResult result) {
        log.info("Migrating manager group members...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO manager_group_2_manager (manager_group_id, manager_id) " +
                "SELECT MANAGER_GROUP_ID, MANAGER_ID FROM MANAGER_GROUP_2_MANAGER"
            ).executeUpdate();
            result.managerGroupMembersMigrated = countRelationRows("manager_group_2_manager");
            log.info("Migrated {} manager group members", result.managerGroupMembersMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager group members", e);
            result.errors.add("ManagerGroupMembers: " + e.getMessage());
        }
    }

    private void migrateManagerPlayers(MigrationResult result) {
        log.info("Migrating manager players...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO manager_2_player (manager_id, player_id) " +
                "SELECT MANAGER_ID, PLAYER_ID FROM MANAGER_2_PLAYERS"
            ).executeUpdate();
            result.managerPlayersMigrated = countRelationRows("manager_2_player");
            log.info("Migrated {} manager player relations", result.managerPlayersMigrated);
        } catch (Exception e) {
            log.error("Error migrating manager players", e);
            result.errors.add("ManagerPlayers: " + e.getMessage());
        }
    }

    private void migrateSeasonTeams(MigrationResult result) {
        log.info("Migrating season teams...");
        try {
            entityManager.createNativeQuery(
                "INSERT INTO season_2_team (season_id, team_id) " +
                "SELECT SEASON_ID, TEAM_ID FROM SEASON_2_TEAM"
            ).executeUpdate();
            result.seasonTeamsMigrated = countRelationRows("season_2_team");
            log.info("Migrated {} season team relations", result.seasonTeamsMigrated);
        } catch (Exception e) {
            log.error("Error migrating season teams", e);
            result.errors.add("SeasonTeams: " + e.getMessage());
        }
    }

    private int countRows(String tableName) {
        Query query = entityManager.createNativeQuery("SELECT COUNT(*) FROM " + tableName);
        return ((Number) query.getSingleResult()).intValue();
    }

    private int countRelationRows(String tableName) {
        try {
            Query query = entityManager.createNativeQuery("SELECT COUNT(*) FROM " + tableName);
            return ((Number) query.getSingleResult()).intValue();
        } catch (Exception e) {
            return 0;
        }
    }

    @Transactional
    public void updateManagerGroups() {
        log.info("Updating manager groups...");
        
        entityManager.createNativeQuery("DELETE FROM manager_group_2_manager").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM ffl_manager_group").executeUpdate();
        
        String[] managerGroups = {
            "1,'Viel Spaß','Altenberger Ultras',1,1",
            "2,'Oberschwaben-Baden-Schweiz','Oberschwaben-Baden-Schweiz',1,1",
            "3,'Alle','[Saison 2025/2026]',1,1",
            "4,'eXXcellent','eXXcellent',1,1",
            "5,'Pflugfelden 1','Pflugfelden 1',1,49",
            "6,'Pflugfelden 2','Pflugfelden 2',1,49",
            "7,'Pflugfelden 3','Pflugfelden 3',1,49",
            "8,'Pflugfelden 4','Pflugfelden 4',1,49",
            "9,'Pflugfelden 5','Pflugfelden 5',1,49",
            "10,'Pflugfelden 6','Pflugfelden 6',1,49",
            "11,'Pflugfelden 7','Pflugfelden 7',1,49",
            "12,'Pflugfelden 8','Pflugfelden 8',1,49",
            "13,'Pflugfelden 9','Pflugfelden 9',1,49",
            "14,'Pflugfelden 10','Pflugfelden 10',1,49",
            "15,'Pflugfelden 11','Pflugfelden 11',1,49",
            "16,'Pflugfelden 12','Pflugfelden 12',1,49",
            "17,'Pflugfelden 13','Pflugfelden 13',1,49",
            "18,'Pflugfelden 14','Pflugfelden 14',1,49",
            "19,'Pflugfelden 15','Pflugfelden 15',1,49",
            "20,'Pflugfelden 16','Pflugfelden 16',1,49",
            "21,'Pflugfelden 17','Pflugfelden 17',1,49",
            "22,'Pflugfelden 18','Pflugfelden 18',1,49",
            "23,'Pflugfelden 19','Pflugfelden 19',1,49",
            "24,'Pflugfelden 20','Pflugfelden 20',1,49",
            "25,'Pflugfelden 21','Pflugfelden 21',1,49",
            "26,'Pflugfelden 22','Pflugfelden 22',1,49",
            "27,'Pflugfelden 23','Pflugfelden 23',1,49",
            "28,'Team Pflugfelden','Team Pflugfelden',1,49",
            "29,'Damke vs. Bauer','Bauer/Damke',1,5",
            "30,'WCHaddeHue','WCHaddeHue',1,124",
            "31,'Wettkampfgruppe','Wettkampfgruppe',1,1",
            "32,'Kochmöpse','FFL Kochmöpse',1,246",
            "33,'Family and Friends','FFL FaF',1,246",
            "34,'Freunde von Wolfgang in der FFL','Wolfgang\\'s Friends',1,4",
            "35,'Pflugfelden','Pflugfelden',1,10",
            "36,'Hier könnte ihre Werbung stehen. 50 Cent und sie sind dabei','Die offene Feldschlacht - working title',1,143"
        };
        
        for (String group : managerGroups) {
            entityManager.createNativeQuery(
                "INSERT INTO ffl_manager_group (id, description, name, season_id) VALUES (" + group + ")"
            ).executeUpdate();
        }
        log.info("Inserted {} manager groups", managerGroups.length);
        
        String[] relations = {
            "1,35","1,54","1,84","1,175","1,185","1,220",
            "2,24","2,55","2,102","2,165","2,221",
            "3,1","3,2","3,3","3,4","3,5","3,6","3,7","3,8","3,9","3,10","3,11","3,12","3,13","3,14","3,15","3,16","3,17","3,18","3,19","3,20","3,21","3,23","3,25","3,26","3,27","3,28","3,29","3,30","3,31","3,32","3,33","3,34","3,35","3,37","3,38","3,39","3,40","3,41","3,42","3,43","3,44","3,45","3,46","3,47","3,48","3,49","3,50","3,51","3,52","3,53","3,54","3,55","3,56","3,57","3,58","3,59","3,60","3,61","3,62","3,63","3,64","3,65","3,66","3,67","3,68","3,69","3,70","3,71","3,72","3,73","3,74","3,75","3,76","3,77","3,78","3,79","3,80","3,81","3,82","3,83","3,84","3,85","3,86","3,87","3,88","3,89","3,90","3,91","3,92","3,93","3,94","3,95","3,96","3,97","3,98","3,99","3,100","3,101","3,102","3,103","3,104","3,105","3,106","3,107","3,108","3,109","3,110","3,111","3,112","3,113","3,114","3,115","3,116","3,117","3,118","3,119","3,120","3,121","3,122","3,123","3,124","3,125","3,126","3,127","3,128","3,129","3,130","3,131","3,132","3,133","3,134","3,135","3,136","3,137","3,138","3,139","3,140","3,141","3,142","3,143","3,144","3,145","3,146","3,147","3,148","3,149","3,150","3,151","3,152","3,153","3,154","3,155","3,156","3,157","3,158","3,159","3,160","3,161","3,162","3,163","3,164","3,165","3,166","3,167","3,168","3,169","3,170","3,171","3,172","3,173","3,174","3,175","3,176","3,177","3,178","3,179","3,180","3,181","3,182","3,183","3,184","3,185","3,186","3,187","3,188","3,189","3,190","3,191","3,192","3,193","3,194","3,195","3,196","3,197","3,198","3,199","3,200","3,201","3,202","3,203","3,204","3,205","3,206","3,207","3,208","3,209","3,210","3,211","3,212","3,213","3,214","3,215","3,216","3,217","3,218","3,219","3,220","3,221","3,222","3,223","3,224","3,225","3,226","3,227","3,228","3,229","3,230","3,231","3,232","3,233","3,234","3,235","3,236","3,237","3,238","3,239","3,240","3,241","3,242","3,243","3,244","3,245","3,246","3,247","3,248","3,249",
            "4,1","4,34","4,82","4,83","4,136","4,207","4,238",
            "5,38","5,65",
            "6,27","6,152",
            "7,47","7,149",
            "8,35","8,54",
            "9,99","9,222",
            "10,73","10,96",
            "11,9","11,231",
            "12,174","12,227",
            "13,100","13,125",
            "14,93","14,98",
            "15,106","15,107",
            "16,52","16,67",
            "17,78","17,214",
            "18,97","18,112",
            "19,8","19,68",
            "20,17","20,61",
            "21,13","21,30",
            "22,88","22,89",
            "23,25","23,126",
            "24,123","24,124",
            "25,142","25,182",
            "26,121","26,135",
            "27,28","27,48",
            "28,8","28,9","28,13","28,17","28,25","28,27","28,28","28,30","28,35","28,38","28,47","28,48","28,52","28,61","28,65","28,67","28,73","28,78","28,88","28,89","28,93","28,96","28,97","28,98","28,99","28,100","28,106","28,107","28,112","28,121","28,123","28,124","28,125","28,126","28,135","28,142","28,149","28,152","28,174","28,182","28,214","28,222","28,227","28,231",
            "29,3","29,4","29,5","29,57","29,58","29,59",
            "30,26","30,40","30,69","30,71","30,122","30,178","30,179","30,191","30,193","30,233",
            "31,41","31,43","31,45","31,114","31,133","31,167","31,239",
            "32,85","32,138","32,188","32,193","32,210","32,237","32,244",
            "33,181","33,189","33,194","33,195","33,197","33,198","33,240","33,241","33,242","33,243","33,245","33,246","33,247","33,249",
            "34,1","34,2","34,23","34,81","34,111","34,140","34,183","34,216","34,219","34,232","34,248",
            "35,1","35,8","35,9","35,10","35,13","35,17","35,25","35,27","35,28","35,30","35,35","35,38","35,47","35,48","35,52","35,54","35,61","35,65","35,67","35,73","35,78","35,88","35,89","35,93","35,96","35,97","35,98","35,99","35,100","35,106","35,107","35,112","35,119","35,121","35,123","35,124","35,125","35,126","35,135","35,142","35,149","35,152","35,174","35,182","35,214","35,222","35,227","35,231",
            "36,51","36,66","36,141","36,204","36,228"
        };
        
        int count = 0;
        for (String rel : relations) {
            try {
                entityManager.createNativeQuery(
                    "INSERT INTO manager_group_2_manager (manager_group_id, manager_id) VALUES (" + rel + ")"
                ).executeUpdate();
                count++;
            } catch (Exception e) {
                log.warn("Could not insert relation {}: {}", rel, e.getMessage());
            }
        }
        log.info("Inserted {} manager-group relations", count);
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
                ", errors=" + errors +
                '}';
        }
    }
}
