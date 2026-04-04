package de.ffl.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CsvImportService {

    private static final Logger log = LoggerFactory.getLogger(CsvImportService.class);
    private static final String CSV_PATH = "data/ffl.csv";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private Map<String, Long> playerNameToId = new HashMap<>();
    private Map<Long, Long> oldPlayerIdToNewId = new HashMap<>();

    public CsvImportService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public CsvImportResult importFromCsv() {
        long startTime = System.currentTimeMillis();
        CsvImportResult result = new CsvImportResult();

        try {
            log.info("Starting CSV import from {}", CSV_PATH);

            Map<String, List<Map<String, String>>> tables = parseCsv();

            clearAllTables();

            importUsers(tables.get("FFL_USER"), result);
            importTeams(tables.get("FFL_TEAM"), result);
            importSeasons(tables.get("FFL_SEASON"), result);
            importPlayers(tables.get("FFL_PLAYER"), result);
            importManagers(tables.get("FFL_MANAGER"), result);
            importRounds(tables.get("FFL_ROUND"), result);
            importGames(tables.get("FFL_GAME"), result);
            importPoints(tables.get("FFL_POINTS"), result);
            importPlayerRanks(tables.get("FFL_PLAYER_RANK"), result);
            importManagerRanks(tables.get("FFL_MANAGER_RANK"), result);
            importManagerGroups(tables.get("FFL_MANAGER_GROUP"), result);
            importManagerGroupMembers(tables.get("MANAGER_GROUP_2_MANAGER"), result);
            importManagerPlayers(tables.get("MANAGER_2_PLAYERS"), result);
            importSeasonTeams(tables.get("SEASON_2_TEAM"), result);
            importTeamPlayers(tables.get("TEAM_2_PLAYER"), result);

            log.info("CSV import completed successfully");

        } catch (Exception e) {
            log.error("Error during CSV import", e);
            result.errors.add("Import failed: " + e.getMessage());
        }

        result.durationMs = System.currentTimeMillis() - startTime;
        return result;
    }

    private void clearAllTables() {
        log.info("Clearing all tables...");
        
jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");
        jdbcTemplate.execute("DELETE FROM manager_2_player");
        jdbcTemplate.execute("DELETE FROM manager_group_2_manager");
        jdbcTemplate.execute("DELETE FROM season_2_team");
        jdbcTemplate.execute("DELETE FROM player_2_team");
        jdbcTemplate.execute("DELETE FROM game_2_players_host");
        jdbcTemplate.execute("DELETE FROM game_2_players_visitor");
        jdbcTemplate.execute("DELETE FROM ffl_points");
        jdbcTemplate.execute("DELETE FROM ffl_player_rank");
        jdbcTemplate.execute("DELETE FROM ffl_manager_rank");
        jdbcTemplate.execute("DELETE FROM ffl_manager_group");
        jdbcTemplate.execute("DELETE FROM ffl_game");
        jdbcTemplate.execute("DELETE FROM ffl_round");
        jdbcTemplate.execute("DELETE FROM ffl_manager");
        jdbcTemplate.execute("DELETE FROM ffl_player");
        jdbcTemplate.execute("DELETE FROM ffl_season");
        jdbcTemplate.execute("DELETE FROM ffl_team");
        jdbcTemplate.execute("DELETE FROM ffl_user");
        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
        
        log.info("Tables cleared");
    }

    private Map<String, List<Map<String, String>>> parseCsv() throws Exception {
        log.info("Parsing CSV file...");
        Map<String, List<Map<String, String>>> tables = new LinkedHashMap<>();
        
        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

            String currentTable = null;
            String[] currentHeaders = null;
            List<Map<String, String>> currentRows = null;

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                String[] parts = parseCsvLine(line);

                if (isHeaderLine(parts)) {
                    if (currentTable != null && currentRows != null) {
                        tables.put(currentTable, currentRows);
                        log.debug("Parsed table {} with {} rows", currentTable, currentRows.size());
                    }

                    String tableName = detectTableName(parts);
                    currentTable = tableName;
                    currentHeaders = parts;
                    currentRows = new ArrayList<>();
                } else if (currentHeaders != null && currentRows != null) {
                    Map<String, String> row = new LinkedHashMap<>();
                    for (int i = 0; i < currentHeaders.length && i < parts.length; i++) {
                        String value = parts[i].trim();
                        if (value.startsWith("\"") && value.endsWith("\"")) {
                            value = value.substring(1, value.length() - 1);
                        }
                        row.put(currentHeaders[i], value);
                    }
                    currentRows.add(row);
                }
            }

            if (currentTable != null && currentRows != null) {
                tables.put(currentTable, currentRows);
                log.debug("Parsed table {} with {} rows", currentTable, currentRows.size());
            }
        }

        log.info("Parsed {} tables from CSV", tables.size());
        tables.keySet().forEach(key -> log.info("Found table: {} with {} rows", key, tables.get(key) != null ? tables.get(key).size() : 0));
        return tables;
    }

    private String[] parseCsvLine(String line) {
        List<String> parts = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == '\t' && !inQuotes) {
                parts.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        parts.add(current.toString());

        return parts.toArray(new String[0]);
    }

    private boolean isHeaderLine(String[] parts) {
        if (parts.length == 0) return false;
        String first = parts[0].trim().toUpperCase();
        return "ID".equals(first) || "TEAM_ID".equals(first) || "MANAGER_ID".equals(first) || "MANAGER_GROUP_ID".equals(first);
    }

private String detectTableName(String[] headers) {
        Set<String> headerSet = new HashSet<>();
        for (String h : headers) {
            headerSet.add(h.trim().toUpperCase());
        }

        // Log for debugging
        String headerStr = String.join(", ", headerSet);
        
        // FFL_USER: has LOGIN, PASSWORD, RE_PASSWORD, user_role
        if (headerSet.contains("LOGIN") && headerSet.contains("PASSWORD") && headerSet.contains("USER_ROLE")) {
            log.debug("Detected FFL_USER from headers: {}", headerStr);
            return "FFL_USER";
        }
        // address table (first table): has Description, address_state, salutation (but NO LOGIN/PASSWORD)
        if (headerSet.contains("DESCRIPTION") && headerSet.contains("ADDRESS_STATE")) {
            log.debug("Detected ADDRESS from headers: {}", headerStr);
            return "ADDRESS";
        }
        // FFL_PLAYER: has Vorname, Nachname, Name_Kicker
        if (headerSet.contains("VORNAME") && headerSet.contains("NACHNAME") && headerSet.contains("NAME_KICKER")) {
            log.debug("Detected FFL_PLAYER from headers: {}", headerStr);
            return "FFL_PLAYER";
        }
        // FFL_GAME: has Formation, NUMBER_GOAL_HOST
        if (headerSet.contains("FORMATION") && headerSet.contains("NUMBER_GOAL_HOST")) {
            log.debug("Detected FFL_GAME from headers: {}", headerStr);
            return "FFL_GAME";
        }
        // FFL_MANAGER: has Budget, DESCRIPTION, FIRST_NAME, LOGIN
        if (headerSet.contains("BUDGET") && headerSet.contains("DESCRIPTION") && headerSet.contains("FIRST_NAME") && headerSet.contains("LOGIN")) {
            log.debug("Detected FFL_MANAGER from headers: {}", headerStr);
            return "FFL_MANAGER";
        }
        // FFL_MANAGER_GROUP: has Description, Name, type
        if (headerSet.contains("DESCRIPTION") && headerSet.contains("NAME") && headerSet.contains("TYPE")) {
            log.debug("Detected FFL_MANAGER_GROUP from headers: {}", headerStr);
            return "FFL_MANAGER_GROUP";
        }
        // FFL_MANAGER_RANK: has POINTS_ROUND, POINTS_TOTAL, MANAGER_ID
        if (headerSet.contains("POINTS_ROUND") && headerSet.contains("POINTS_TOTAL") && headerSet.contains("MANAGER_ID")) {
            log.debug("Detected FFL_MANAGER_RANK from headers: {}", headerStr);
            return "FFL_MANAGER_RANK";
        }
        // FFL_PLAYER_RANK: has NUMBER_MATCHES, PLAYED, PLAYER_ID
        if (headerSet.contains("NUMBER_MATCHES") && headerSet.contains("PLAYED") && headerSet.contains("PLAYER_ID")) {
            log.debug("Detected FFL_PLAYER_RANK from headers: {}", headerStr);
            return "FFL_PLAYER_RANK";
        }
        // FFL_POINTS: has NUMBER_POINTS, RULE
        if (headerSet.contains("NUMBER_POINTS") && headerSet.contains("RULE")) {
            log.debug("Detected FFL_POINTS from headers: {}", headerStr);
            return "FFL_POINTS";
        }
        // FFL_ROUND: has NAME and season_id (no other specific markers)
        if (headerSet.contains("NAME") && headerSet.contains("SEASON_ID") && !headerSet.contains("BUDGET") && !headerSet.contains("DESCRIPTION") && !headerSet.contains("TYPE")) {
            log.debug("Detected FFL_ROUND from headers: {}", headerStr);
            return "FFL_ROUND";
        }
        // FFL_SEASON: has FinalRegistrationDate or FINAL_REGISTRATION_DATE
        if (headerSet.contains("FINALREGISTRATIONDATE") || headerSet.contains("FINAL_REGISTRATION_DATE")) {
            log.debug("Detected FFL_SEASON from headers: {}", headerStr);
            return "FFL_SEASON";
        }
        // FFL_TEAM: has LogoSUrl, LogoXxlUrl
        if (headerSet.contains("LOGOSURL") && headerSet.contains("LOGOXXLURL")) {
            log.debug("Detected FFL_TEAM from headers: {}", headerStr);
            return "FFL_TEAM";
        }
        // MANAGER_2_PLAYERS: has MANAGER_ID, PLAYER_ID (but no POINTS)
        if (headerSet.contains("MANAGER_ID") && headerSet.contains("PLAYER_ID") && !headerSet.contains("POINTS")) {
            log.debug("Detected MANAGER_2_PLAYERS from headers: {}", headerStr);
            return "MANAGER_2_PLAYERS";
        }
        // SEASON_2_TEAM: has SEASON_ID, TEAM_ID (no NAME)
        if (headerSet.contains("SEASON_ID") && headerSet.contains("TEAM_ID") && !headerSet.contains("NAME")) {
            log.debug("Detected SEASON_2_TEAM from headers: {}", headerStr);
            return "SEASON_2_TEAM";
        }
        // MANAGER_GROUP_2_MANAGER: has MANAGER_GROUP_ID, MANAGER_ID
        if (headerSet.contains("MANAGER_GROUP_ID") && headerSet.contains("MANAGER_ID")) {
            log.debug("Detected MANAGER_GROUP_2_MANAGER from headers: {}", headerStr);
            return "MANAGER_GROUP_2_MANAGER";
        }
        // TEAM_2_PLAYER: has TEAM_ID, PLAYER_ID (no other columns)
        if (headerSet.contains("TEAM_ID") && headerSet.contains("PLAYER_ID") && headerSet.size() == 2) {
            log.debug("Detected TEAM_2_PLAYER from headers: {}", headerStr);
            return "TEAM_2_PLAYER";
        }

        log.warn("Unknown table detected from headers: {}", headerStr);
        return "UNKNOWN_" + Arrays.hashCode(headers);
    }

    private void importUsers(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} users...", rows.size());

        String sql = "INSERT INTO ffl_user (id, login, password, email, first_name, last_name, street, city, birthday, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long id = parseLong(row.get("id"));
                String login = getString(row, "LOGIN");
                
                // Skip rows without required fields
                if (id == null || login == null || login.isEmpty()) {
                    log.debug("Skipping user row with missing id or login: {}", row);
                    continue;
                }

                String email = getString(row, "EMAIL");
                if (email == null || email.isEmpty()) {
                    email = login.toLowerCase() + "@ffl.local";
                }

                String rawPassword = getStringOrDefault(row, "PASSWORD", "password");
                String encodedPassword = passwordEncoder.encode(rawPassword);

                jdbcTemplate.update(sql,
                        id,
                        login,
                        encodedPassword,
                        email,
                        getString(row, "FIRST_NAME"),
                        getString(row, "LAST_NAME"),
                        getString(row, "STREET"),
                        getString(row, "CITY"),
                        getString(row, "BIRTHDAY"),
                        mapUserRole(getString(row, "user_role")));

                result.usersImported++;
            } catch (Exception e) {
                log.warn("Error importing user row: {}", row, e);
                result.errors.add("User row error: " + e.getMessage());
            }
        }
        log.info("Imported {} users", result.usersImported);
    }

    private void importTeams(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} teams...", rows.size());

        String sql = "INSERT INTO ffl_team (id, name, short_name, logo_xxl_url, logosurl) VALUES (?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                jdbcTemplate.update(sql,
                        parseLong(row.get("id")),
                        getString(row, "Name"),
                        getString(row, "Short_Name"),
                        getString(row, "LogoXxlUrl"),
                        getString(row, "LogoSUrl"));

                result.teamsImported++;
            } catch (Exception e) {
                log.warn("Error importing team row: {}", row, e);
                result.errors.add("Team row error: " + e.getMessage());
            }
        }
        log.info("Imported {} teams", result.teamsImported);
    }

    private void importSeasons(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} seasons...", rows.size());

        String sql = "INSERT INTO ffl_season (id, name, budget, season_state, final_registration_date) VALUES (?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                String name = getString(row, "Name");
                if (name == null) name = getString(row, "name");
                if (name == null || name.isEmpty()) {
                    name = "Season " + row.get("id");
                }

                String budgetStr = row.get("Budget");
                if (budgetStr == null) budgetStr = row.get("budget");
                Integer budget = parseInteger(budgetStr);

                String dateStr = getString(row, "FinalRegistrationDate");
                if (dateStr == null) dateStr = getString(row, "final_registration_date");

                jdbcTemplate.update(sql,
                        parseLong(row.get("id")),
                        "2025/26",
                        budget != null ? budget : 30000000,
                        "RUNNING_RUECKRUNDE",
                        parseDate(dateStr));

                result.seasonsImported++;
            } catch (Exception e) {
                log.warn("Error importing season row: {}", row, e);
                result.errors.add("Season row error: " + e.getMessage());
            }
        }
        log.info("Imported {} seasons", result.seasonsImported);
    }

    private void importPlayers(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} player rows (deduplicating by name)...", rows.size());

        playerNameToId.clear();
        oldPlayerIdToNewId.clear();

        String sql = "INSERT INTO ffl_player (id, name_kicker, name_kicker_alt1, name_kicker_alt2, name_kicker_alt3, first_name, last_name, position, prize, picture_url, season_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                String nameKicker = getString(row, "Name_Kicker");
                if (nameKicker == null || nameKicker.isEmpty()) {
                    String firstName = getString(row, "Vorname");
                    String lastName = getString(row, "Nachname");
                    nameKicker = (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
                }
                
                if (nameKicker == null || nameKicker.isEmpty()) {
                    continue;
                }

                Long originalId = parseLong(row.get("id"));
                
                if (playerNameToId.containsKey(nameKicker)) {
                    Long existingNewId = playerNameToId.get(nameKicker);
                    oldPlayerIdToNewId.put(originalId, existingNewId);
                    log.debug("Mapping duplicate player {} (original id {}) to existing id {}", nameKicker, originalId, existingNewId);
                    continue;
                }

                Long newId = (long) (playerNameToId.size() + 1);
                playerNameToId.put(nameKicker, newId);
                oldPlayerIdToNewId.put(originalId, newId);

                jdbcTemplate.update(sql,
                        newId,
                        nameKicker,
                        getString(row, "Name_Kicker_Alt1"),
                        getString(row, "Name_Kicker_Alt2"),
                        getString(row, "Name_Kicker_Alt3"),
                        getString(row, "Vorname"),
                        getString(row, "Nachname"),
                        mapPosition(getString(row, "player_position")),
                        parsePrize(row.get("Prize")),
                        getString(row, "PictureUrl"),
                        parseLong(row.get("season_id")));

                result.playersImported++;
            } catch (Exception e) {
                log.warn("Error importing player row: {}", row, e);
                result.errors.add("Player row error: " + e.getMessage());
            }
        }
        
        log.info("Imported {} unique players (from {} rows)", result.playersImported, rows.size());
    }

    private void importManagers(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} managers...", rows.size());

        String sql = "INSERT INTO ffl_manager (id, name, short_name, budget, payment_state, description, season_id, user_id, " +
                "player_goalkeeper_id, player_defender1_id, player_defender2_id, player_defender3_id, " +
                "player_midfield1_id, player_midfield2_id, player_midfield3_id, " +
                "player_striker1_id, player_striker2_id, player_striker3_id, player_free_choice_id, " +
                "player_exchanged_old1_id, player_exchanged_old2_id, player_exchanged_old3_id, " +
                "player_exchanged_new1_id, player_exchanged_new2_id, player_exchanged_new3_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                String name = getString(row, "FIRST_NAME");
                String lastName = getString(row, "LAST_NAME");
                if (name != null && lastName != null) {
                    name = name + " " + lastName;
                } else if (name == null) {
                    name = getString(row, "LOGIN");
                }

                jdbcTemplate.update(sql,
                        parseLong(row.get("id")),
                        name,
                        getString(row, "LOGIN"),
                        getIntegerOrDefault(row, "Budget", 0),
                        mapPaymentState(getString(row, "payment")),
                        getString(row, "DESCRIPTION"),
                        parseLong(row.get("season_id")),
                        parseLong(row.get("user_id")),
                        mapPlayerId(parseLong(row.get("playerGoalkeeper_id"))),
                        mapPlayerId(parseLong(row.get("playerDefender1_id"))),
                        mapPlayerId(parseLong(row.get("playerDefender2_id"))),
                        mapPlayerId(parseLong(row.get("playerDefender3_id"))),
                        mapPlayerId(parseLong(row.get("playerMidfield1_id"))),
                        mapPlayerId(parseLong(row.get("playerMidfield2_id"))),
                        mapPlayerId(parseLong(row.get("playerMidfield3_id"))),
                        mapPlayerId(parseLong(row.get("playerStriker1_id"))),
                        mapPlayerId(parseLong(row.get("playerStriker2_id"))),
                        mapPlayerId(parseLong(row.get("playerStriker3_id"))),
                        mapPlayerId(parseLong(row.get("playerFreeChoice_id"))),
                        mapPlayerId(parseLong(row.get("playerExhangedOld1_id"))),
                        mapPlayerId(parseLong(row.get("playerExhangedOld2_id"))),
                        mapPlayerId(parseLong(row.get("playerExhangedOld3_id"))),
                        mapPlayerId(parseLong(row.get("playerExhangedNew1_id"))),
                        mapPlayerId(parseLong(row.get("playerExhangedNew2_id"))),
                        mapPlayerId(parseLong(row.get("playerExhangedNew3_id"))));

                result.managersImported++;
            } catch (Exception e) {
                log.warn("Error importing manager row: {}", row, e);
                result.errors.add("Manager row error: " + e.getMessage());
            }
        }
        log.info("Imported {} managers", result.managersImported);
    }

    private void importRounds(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} rounds...", rows.size());

        String sql = "INSERT INTO ffl_round (id, number, season_id) VALUES (?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long id = parseLong(row.get("id"));
                // CSV column is "NAME", but database column is "number"
                Integer number = getInteger(row, "NAME");
                if (number == null) {
                    number = getInteger(row, "NUMBER");
                }
                Long seasonId = parseLong(row.get("season_id"));
                
                if (id == null || number == null || seasonId == null) {
                    log.debug("Skipping round row with missing fields: {}", row);
                    continue;
                }

                jdbcTemplate.update(sql, id, number, seasonId);

                result.roundsImported++;
            } catch (Exception e) {
                log.warn("Error importing round row: {}", row, e);
                result.errors.add("Round row error: " + e.getMessage());
            }
        }
        log.info("Imported {} rounds", result.roundsImported);
    }

    private void importGames(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} games...", rows.size());

        String sql = "INSERT INTO ffl_game (id, name, host_id, visitor_id, goal_host, goal_visitor, round_id, formation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long id = parseLong(row.get("id"));
                Long hostId = parseLong(row.get("TEAM_HOST_ID"));
                Long visitorId = parseLong(row.get("TEAM_VISITOR_ID"));
                Long roundId = parseLong(row.get("round_id"));
                
                if (id == null || hostId == null || visitorId == null || roundId == null) {
                    log.debug("Skipping game row with missing fields: {}", row);
                    continue;
                }

                String name = getString(row, "Name");
                if (name == null || name.isEmpty()) {
                    name = "Game " + id;
                }

                String formation = getString(row, "Formation");

                jdbcTemplate.update(sql,
                        id,
                        name,
                        hostId,
                        visitorId,
                        getInteger(row, "NUMBER_GOAL_HOST"),
                        getInteger(row, "NUMBER_GOAL_VISITOR"),
                        roundId,
                        formation);

                result.gamesImported++;
            } catch (Exception e) {
                log.warn("Error importing game row: {}", row, e);
                result.errors.add("Game row error: " + e.getMessage());
            }
        }
        log.info("Imported {} games", result.gamesImported);
    }

    private void importPoints(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} points...", rows.size());

        String sql = "INSERT INTO ffl_points (id, number, rule, game_id, player_id) VALUES (?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long id = parseLong(row.get("id"));
                Long gameId = parseLong(row.get("game_id"));
                Long oldPlayerId = parseLong(row.get("player_id"));
                
                if (id == null || gameId == null || oldPlayerId == null) {
                    log.debug("Skipping points row with missing fields: {}", row);
                    continue;
                }

                Long newPlayerId = mapPlayerId(oldPlayerId);
                if (newPlayerId == null) {
                    log.debug("No mapping for player id {} in points row", oldPlayerId);
                    continue;
                }

                String rule = mapRule(getString(row, "rule"));

                jdbcTemplate.update(sql,
                        id,
                        getInteger(row, "NUMBER_POINTS"),
                        rule,
                        gameId,
                        newPlayerId);

                result.pointsImported++;
            } catch (Exception e) {
                log.warn("Error importing points row: {}", row, e);
                result.errors.add("Points row error: " + e.getMessage());
            }
        }
        log.info("Imported {} points", result.pointsImported);
    }

    private void importPlayerRanks(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} player ranks...", rows.size());

        String sql = "INSERT INTO ffl_player_rank (id, number_matches, played, points_round, points_total, position_round, position_total, player_id, round_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long id = parseLong(row.get("id"));
                Long oldPlayerId = parseLong(row.get("player_id"));
                Long roundId = parseLong(row.get("round_id"));
                
                if (id == null || oldPlayerId == null || roundId == null) {
                    log.debug("Skipping player rank row with missing fields: {}", row);
                    continue;
                }

                Long newPlayerId = mapPlayerId(oldPlayerId);
                if (newPlayerId == null) {
                    log.debug("No mapping for player id {} in player rank row", oldPlayerId);
                    continue;
                }

                Integer played = getBooleanAsInteger(row, "PLAYED");

                jdbcTemplate.update(sql,
                        id,
                        getInteger(row, "NUMBER_MATCHES"),
                        played,
                        getInteger(row, "POINTS_ROUND"),
                        getInteger(row, "POINTS_TOTAL"),
                        getInteger(row, "POSITION_ROUND"),
                        getInteger(row, "POSITION_TOTAL"),
                        newPlayerId,
                        roundId);

                result.playerRanksImported++;
            } catch (Exception e) {
                log.warn("Error importing player rank row: {}", row, e);
                result.errors.add("PlayerRank row error: " + e.getMessage());
            }
        }
        log.info("Imported {} player ranks", result.playerRanksImported);
    }

    private void importManagerRanks(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} manager ranks...", rows.size());

        String sql = "INSERT INTO ffl_manager_rank (id, points_round, points_total, position_round, position_total, manager_id, round_id) VALUES (?, ?, ?, ?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long id = parseLong(row.get("id"));
                Long managerId = parseLong(row.get("manager_id"));
                Long roundId = parseLong(row.get("round_id"));
                
                if (id == null || managerId == null || roundId == null) {
                    log.debug("Skipping manager rank row with missing fields: {}", row);
                    continue;
                }

                jdbcTemplate.update(sql,
                        id,
                        getInteger(row, "POINTS_ROUND"),
                        getInteger(row, "POINTS_TOTAL"),
                        getInteger(row, "POSITION_ROUND"),
                        getInteger(row, "POSITION_TOTAL"),
                        managerId,
                        roundId);

                result.managerRanksImported++;
            } catch (Exception e) {
                log.warn("Error importing manager rank row: {}", row, e);
                result.errors.add("ManagerRank row error: " + e.getMessage());
            }
        }
        log.info("Imported {} manager ranks", result.managerRanksImported);
    }

    private void importManagerGroups(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} manager groups...", rows.size());

        String sql = "INSERT INTO ffl_manager_group (id, name, description, season_id) VALUES (?, ?, ?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long id = parseLong(row.get("id"));
                Long seasonId = parseLong(row.get("season_id"));
                
                if (id == null || seasonId == null) {
                    log.debug("Skipping manager group row with missing fields: {}", row);
                    continue;
                }

                String name = getString(row, "Name");
                if (name == null || name.isEmpty()) {
                    name = "Group " + id;
                }

                jdbcTemplate.update(sql,
                        id,
                        name,
                        getString(row, "Description"),
                        seasonId);

                result.managerGroupsImported++;
            } catch (Exception e) {
                log.warn("Error importing manager group row: {}", row, e);
                result.errors.add("ManagerGroup row error: " + e.getMessage());
            }
        }
        log.info("Imported {} manager groups", result.managerGroupsImported);
    }

    private void importManagerGroupMembers(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) {
            log.warn("MANAGER_GROUP_2_MANAGER table is null - not found in CSV");
            return;
        }
        log.info("Importing {} manager-group relations...", rows.size());

        String sql = "INSERT INTO manager_group_2_manager (manager_group_id, manager_id) VALUES (?, ?)";

        int count = 0;
        for (Map<String, String> row : rows) {
            try {
                Long groupId = parseLong(row.get("MANAGER_GROUP_ID"));
                Long managerId = parseLong(row.get("MANAGER_ID"));
                
                if (groupId == null || managerId == null) {
                    log.debug("Skipping manager-group row with missing fields: {}", row);
                    continue;
                }

                jdbcTemplate.update(sql, groupId, managerId);
                count++;
            } catch (Exception e) {
                log.warn("Error importing manager-group relation: {}", row, e);
                result.errors.add("ManagerGroup relation error: " + e.getMessage());
            }
        }
        log.info("Imported {} manager-group relations (total rows: {})", count, rows.size());
    }

    private void importManagerPlayers(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} manager-player relations...", rows.size());

        String sql = "INSERT INTO manager_2_player (manager_id, player_id) VALUES (?, ?)";

        Set<String> insertedRelations = new HashSet<>();

        for (Map<String, String> row : rows) {
            try {
                Long managerId = parseLong(row.get("MANAGER_ID"));
                Long oldPlayerId = parseLong(row.get("PLAYER_ID"));
                
                if (managerId == null || oldPlayerId == null) {
                    log.debug("Skipping manager-player row with missing fields: {}", row);
                    continue;
                }

                Long newPlayerId = mapPlayerId(oldPlayerId);
                if (newPlayerId == null) {
                    log.warn("No mapping for player id {} in manager-player relation", oldPlayerId);
                    continue;
                }

                String relationKey = managerId + "_" + newPlayerId;
                if (insertedRelations.contains(relationKey)) {
                    continue;
                }
                insertedRelations.add(relationKey);

                jdbcTemplate.update(sql, managerId, newPlayerId);

                result.managerPlayersImported++;
            } catch (Exception e) {
                log.warn("Error importing manager-player relation: {}", row, e);
                result.errors.add("ManagerPlayer relation error: " + e.getMessage());
            }
        }
        log.info("Imported {} manager-player relations", result.managerPlayersImported);
    }

    private void importSeasonTeams(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} season-team relations...", rows.size());

        String sql = "INSERT INTO season_2_team (season_id, team_id) VALUES (?, ?)";

        for (Map<String, String> row : rows) {
            try {
                Long seasonId = parseLong(row.get("SEASON_ID"));
                Long teamId = parseLong(row.get("TEAM_ID"));
                
                if (seasonId == null || teamId == null) {
                    log.debug("Skipping season-team row with missing ids: {}", row);
                    continue;
                }

                jdbcTemplate.update(sql, seasonId, teamId);

                result.seasonTeamsImported++;
            } catch (Exception e) {
                log.warn("Error importing season-team relation: {}", row, e);
                result.errors.add("SeasonTeam relation error: " + e.getMessage());
            }
        }
        log.info("Imported {} season-team relations", result.seasonTeamsImported);
    }

    private void importTeamPlayers(List<Map<String, String>> rows, CsvImportResult result) {
        if (rows == null) return;
        log.info("Importing {} team-player relations...", rows.size());

        String sql = "INSERT INTO player_2_team (player_id, team_id) VALUES (?, ?)";

        Set<String> insertedRelations = new HashSet<>();

        for (Map<String, String> row : rows) {
            try {
                Long originalPlayerId = parseLong(row.get("PLAYER_ID"));
                Long teamId = parseLong(row.get("TEAM_ID"));
                
                if (originalPlayerId == null || teamId == null) {
                    log.debug("Skipping team-player row with missing ids: {}", row);
                    continue;
                }

                Long newPlayerId = oldPlayerIdToNewId.get(originalPlayerId);
                if (newPlayerId == null) {
                    log.warn("No mapping found for player id {}", originalPlayerId);
                    continue;
                }

                String relationKey = newPlayerId + "_" + teamId;
                if (insertedRelations.contains(relationKey)) {
                    continue;
                }
                insertedRelations.add(relationKey);

                jdbcTemplate.update(sql, newPlayerId, teamId);

                result.teamPlayersImported++;
            } catch (Exception e) {
                log.warn("Error importing team-player relation: {}", row, e);
                result.errors.add("TeamPlayer relation error: " + e.getMessage());
            }
        }
        log.info("Imported {} team-player relations", result.teamPlayersImported);
    }

    // Helper methods
    private Long parseLong(String value) {
        if (value == null || value.isEmpty()) return null;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parsePrize(String value) {
        if (value == null || value.isEmpty()) return 0;
        try {
            double millions = Double.parseDouble(value);
            return (int) (millions * 1_000_000);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Integer parseInteger(String value) {
        if (value == null || value.isEmpty()) return 0;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Integer getInteger(Map<String, String> row, String key) {
        String value = row.get(key);
        if (value == null || value.isEmpty()) return null;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer getIntegerOrDefault(Map<String, String> row, String key, Integer defaultValue) {
        String value = row.get(key);
        if (value == null || value.isEmpty()) return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private Integer getBooleanAsInteger(Map<String, String> row, String key) {
        String value = row.get(key);
        if (value == null || value.isEmpty()) return 0;
        if (value.equalsIgnoreCase("true")) return 1;
        if (value.equalsIgnoreCase("false")) return 0;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String getString(Map<String, String> row, String key) {
        String value = row.get(key);
        if (value == null) return null;
        if (value.equalsIgnoreCase("(null)") || value.isEmpty()) return null;
        if (value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }
        return value.isEmpty() ? null : value;
    }

    private String getStringOrDefault(Map<String, String> row, String key, String defaultValue) {
        String value = getString(row, key);
        return value != null && !value.isEmpty() ? value : defaultValue;
    }

    private String mapUserRole(String value) {
        if (value == null) return "NORMAL";
        return switch (value) {
            case "0" -> "ADMIN";
            case "1" -> "NORMAL";
            case "2" -> "GUEST";
            default -> "NORMAL";
        };
    }

    private String mapPosition(String value) {
        if (value == null) return "MIDFIELD";
        return switch (value) {
            case "0" -> "GOALKEEPER";
            case "1" -> "DEFENDER";
            case "2" -> "MIDFIELD";
            case "3" -> "STRIKER";
            default -> "MIDFIELD";
        };
    }

    private String mapSeasonState(String value) {
        if (value == null) return "BEFORE_SEASON";
        return switch (value) {
            case "0" -> "BEFORE_SEASON";
            case "1" -> "RUNNING_HINRUNDE";
            case "2" -> "RUNNING_RUECKRUNDE";
            case "BEFORE_SEASON" -> "BEFORE_SEASON";
            case "RUNNING_HINRUNDE" -> "RUNNING_HINRUNDE";
            case "RUNNING_RUECKRUNDE" -> "RUNNING_RUECKRUNDE";
            default -> "BEFORE_SEASON";
        };
    }

    private Long mapPlayerId(Long oldId) {
        if (oldId == null) return null;
        return oldPlayerIdToNewId.getOrDefault(oldId, oldId);
    }

    private String mapPaymentState(String value) {
        if (value == null) return "NOT_PAID";
        return switch (value) {
            case "0" -> "NOT_PAID";
            case "1" -> "PAID";
            default -> "NOT_PAID";
        };
    }

    private String mapRule(String value) {
        if (value == null) return "GOAL_STRIKER";
        return switch (value) {
            case "0" -> "GOAL_STRIKER";
            case "1" -> "GOAL_MIDFIELDER";
            case "2" -> "GOAL_DEFENDER";
            case "3" -> "TO_NULL_GOALKEEPER";
            case "4" -> "TO_NULL_DEFENDER";
            case "5" -> "GOAL_GOALKEEPER";
            case "6" -> "GOAL_GOALKEEPER_BY_PENALTY";
            default -> "GOAL_STRIKER";
        };
    }

    private String parseDate(String value) {
        if (value == null || value.isEmpty()) return null;
        try {
            LocalDate date = LocalDate.parse(value, DATE_FORMATTER);
            return date.toString();
        } catch (Exception e) {
            try {
                LocalDate date = LocalDate.parse(value);
                return date.toString();
            } catch (Exception e2) {
                return null;
            }
        }
    }

    public static class CsvImportResult {
        public int usersImported = 0;
        public int teamsImported = 0;
        public int seasonsImported = 0;
        public int playersImported = 0;
        public int managersImported = 0;
        public int roundsImported = 0;
        public int gamesImported = 0;
        public int pointsImported = 0;
        public int playerRanksImported = 0;
        public int managerRanksImported = 0;
        public int managerGroupsImported = 0;
        public int managerPlayersImported = 0;
        public int seasonTeamsImported = 0;
        public int teamPlayersImported = 0;
        public List<String> errors = new ArrayList<>();
        public long durationMs;

        @Override
        public String toString() {
            return "CsvImportResult{" +
                    "users=" + usersImported +
                    ", teams=" + teamsImported +
                    ", seasons=" + seasonsImported +
                    ", players=" + playersImported +
                    ", managers=" + managersImported +
                    ", rounds=" + roundsImported +
                    ", games=" + gamesImported +
                    ", points=" + pointsImported +
                    ", playerRanks=" + playerRanksImported +
                    ", managerRanks=" + managerRanksImported +
                    ", managerGroups=" + managerGroupsImported +
                    ", managerPlayers=" + managerPlayersImported +
                    ", seasonTeams=" + seasonTeamsImported +
                    ", teamPlayers=" + teamPlayersImported +
                    ", errors=" + errors.size() +
                    ", duration=" + durationMs + "ms" +
                    '}';
        }
    }
}