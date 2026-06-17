package de.ffl.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.file.Path;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
@Order(1)
public class H2MigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(H2MigrationRunner.class);

    private static final List<String> TABLES_IN_ORDER = List.of(
            "FFL_USER",
            "FFL_TEAM",
            "FFL_SYSTEM_CONFIG",
            "FFL_EMAIL_ADDRESS",
            "FFL_SEASON",
            "SEASON_2_TEAM",
            "FFL_ROUND",
            "FFL_PLAYER",
            "FFL_PRIZE_DISTRIBUTION_LOG",
            "PLAYER_2_TEAM",
            "FFL_MANAGER",
            "MANAGER_2_PLAYER",
            "FFL_MANAGER_GROUP",
            "MANAGER_GROUP_2_MANAGER",
            "FFL_MANAGER_RANK",
            "FFL_PLAYER_RANK",
            "FFL_GAME",
            "GAME_2_PLAYERS_HOST",
            "GAME_2_PLAYERS_VISITOR",
            "FFL_POINTS",
            "FFL_PRIZE_PAYOUT"
    );

    private final DataSource dataSource;

    public H2MigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        Path h2File = Path.of("C:/Projects/fflng/ffl-backend/data/ffl.mv.db");
        if (!h2File.toFile().exists()) {
            log.info("H2-Datenbankdatei nicht gefunden ({}), Migration wird uebersprungen.", h2File);
            return;
        }

        try (Connection pgConn = dataSource.getConnection()) {
            if (!isPgEmpty(pgConn)) {
                log.info("PostgreSQL-Datenbank enthaelt bereits Daten, Migration wird uebersprungen.");
                return;
            }
        }

        log.info("=== H2 -> PostgreSQL Migration starten ===");
        String h2Url = "jdbc:h2:file:C:/Projects/fflng/ffl-backend/data/ffl;ACCESS_MODE_DATA=r";

        try (Connection h2Conn = DriverManager.getConnection(h2Url, "sa", "");
             Connection pgConn = dataSource.getConnection()) {

            pgConn.setAutoCommit(false);

            int totalRows = 0;
            for (String table : TABLES_IN_ORDER) {
                if (!tableExistsInH2(h2Conn, table)) {
                    log.info("  Tabelle {} existiert nicht in H2, uebersprungen.", table);
                    continue;
                }
                int rows = migrateTable(h2Conn, pgConn, table);
                totalRows += rows;
            }

            updateSequences(pgConn);

            pgConn.commit();
            log.info("=== Migration abgeschlossen: {} Zeilen insgesamt ===", totalRows);

        } catch (Exception e) {
            log.error("Migration fehlgeschlagen!", e);
            throw e;
        }
    }

    private boolean isPgEmpty(Connection pgConn) {
        try (Statement stmt = pgConn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM ffl_user")) {
            rs.next();
            return rs.getInt(1) == 0;
        } catch (SQLException e) {
            return true;
        }
    }

    private boolean tableExistsInH2(Connection h2Conn, String table) {
        try (ResultSet rs = h2Conn.getMetaData().getTables(null, "PUBLIC", table, null)) {
            return rs.next();
        } catch (SQLException e) {
            return false;
        }
    }

    private int migrateTable(Connection h2Conn, Connection pgConn, String table) throws SQLException {
        String pgTable = table.toLowerCase();

        Set<String> pgColumns = getTableColumns(pgConn, pgTable);
        if (pgColumns.isEmpty()) {
            log.info("  {} -> Zieltabelle hat keine Spalten oder existiert nicht, uebersprungen.", pgTable);
            return 0;
        }

        try (Statement h2Stmt = h2Conn.createStatement();
             ResultSet rs = h2Stmt.executeQuery("SELECT * FROM \"" + table + "\"")) {

            ResultSetMetaData meta = rs.getMetaData();
            int colCount = meta.getColumnCount();

            if (colCount == 0) return 0;

            List<Integer> validIndices = new ArrayList<>();
            StringBuilder colNames = new StringBuilder();
            StringBuilder placeholders = new StringBuilder();

            for (int i = 1; i <= colCount; i++) {
                String colName = meta.getColumnName(i).toLowerCase();
                if (pgColumns.contains(colName)) {
                    if (!validIndices.isEmpty()) {
                        colNames.append(", ");
                        placeholders.append(", ");
                    }
                    validIndices.add(i);
                    colNames.append("\"").append(colName).append("\"");
                    placeholders.append("?");
                } else {
                    log.debug("  {} -> Spalte '{}' existiert nicht in PG, uebersprungen.", pgTable, colName);
                }
            }

            if (validIndices.isEmpty()) return 0;

            String insertSql = "INSERT INTO \"" + pgTable + "\" (" + colNames + ") VALUES (" + placeholders + ")";

            int rowCount = 0;
            try (PreparedStatement pgStmt = pgConn.prepareStatement(insertSql)) {
                while (rs.next()) {
                    for (int paramIdx = 0; paramIdx < validIndices.size(); paramIdx++) {
                        int srcIdx = validIndices.get(paramIdx);
                        Object value = rs.getObject(srcIdx);
                        if (value == null) {
                            pgStmt.setNull(paramIdx + 1, meta.getColumnType(srcIdx));
                        } else {
                            pgStmt.setObject(paramIdx + 1, value);
                        }
                    }
                    pgStmt.addBatch();
                    rowCount++;

                    if (rowCount % 500 == 0) {
                        pgStmt.executeBatch();
                    }
                }
                if (rowCount % 500 != 0) {
                    pgStmt.executeBatch();
                }
            }

            log.info("  {} -> {} Zeilen migriert", pgTable, rowCount);
            return rowCount;
        }
    }

    private Set<String> getTableColumns(Connection conn, String table) throws SQLException {
        Set<String> columns = new HashSet<>();
        try (ResultSet rs = conn.getMetaData().getColumns(null, null, table, null)) {
            while (rs.next()) {
                columns.add(rs.getString("COLUMN_NAME").toLowerCase());
            }
        }
        return columns;
    }

    private void updateSequences(Connection pgConn) throws SQLException {
        List<String> entityTables = List.of(
                "ffl_user", "ffl_team", "ffl_system_config", "ffl_email_address",
                "ffl_season", "ffl_round", "ffl_player", "ffl_prize_distribution_log",
                "ffl_manager", "ffl_manager_group", "ffl_manager_rank", "ffl_player_rank",
                "ffl_game", "ffl_points", "ffl_prize_payout"
        );

        try (Statement stmt = pgConn.createStatement()) {
            for (String table : entityTables) {
                try {
                    String sql = "SELECT setval(pg_get_serial_sequence('\"" + table + "\"', 'id'), "
                            + "COALESCE((SELECT MAX(id) FROM \"" + table + "\"), 1))";
                    stmt.execute(sql);
                    log.info("  Sequence fuer {} aktualisiert", table);
                } catch (SQLException e) {
                    log.debug("  Sequence fuer {} nicht gefunden oder leer: {}", table, e.getMessage());
                }
            }
        }
    }
}
