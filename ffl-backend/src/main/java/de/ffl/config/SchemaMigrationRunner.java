package de.ffl.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

@Component
@Order(2)
public class SchemaMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaMigrationRunner.class);

    private final DataSource dataSource;

    public SchemaMigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            List<String> migrations = new ArrayList<>();

            if (columnExists(conn, "ffl_manager", "name")) {
                migrations.add("ALTER TABLE ffl_manager DROP COLUMN IF EXISTS name");
            }

            if (columnExists(conn, "ffl_manager", "short_name")) {
                migrations.add("ALTER TABLE ffl_manager DROP COLUMN IF EXISTS short_name");
            }

            if (migrations.isEmpty()) {
                return;
            }

            try (Statement stmt = conn.createStatement()) {
                for (String sql : migrations) {
                    stmt.execute(sql);
                }
            }

            log.info("Schema migration: removed name/short_name from ffl_manager");
        } catch (SQLException e) {
            log.warn("Schema migration skipped: {}", e.getMessage());
        }
    }

    private boolean columnExists(Connection conn, String table, String column) throws SQLException {
        try (ResultSet rs = conn.getMetaData().getColumns(null, null, table, column)) {
            return rs.next();
        }
    }
}
