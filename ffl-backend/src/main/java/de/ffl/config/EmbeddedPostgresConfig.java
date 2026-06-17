package de.ffl.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
@Profile("!docker")
public class EmbeddedPostgresConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddedPostgresConfig.class);

    @Bean
    public DataSource dataSource() throws IOException {
        Path dataDir = Path.of(System.getProperty("user.home"), ".ffl", "pg-data");
        Files.createDirectories(dataDir);

        log.info("=== Embedded PostgreSQL starten ===");
        log.info("  Datenverzeichnis: {}", dataDir.toAbsolutePath());

        EmbeddedPostgres pg = EmbeddedPostgres.builder()
                .setPort(15433)
                .setDataDirectory(dataDir.toFile())
                .setCleanDataDirectory(false)
                .start();

        DataSource dataSource = pg.getPostgresDatabase();
        log.info("  Port: 15433");
        log.info("  Datenbank: postgres");
        log.info("  Embedded PostgreSQL gestartet");

        return dataSource;
    }
}
