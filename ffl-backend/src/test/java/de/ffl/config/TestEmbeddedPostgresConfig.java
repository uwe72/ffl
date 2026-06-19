package de.ffl.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
@Profile("test")
public class TestEmbeddedPostgresConfig {

    @Bean
    public DataSource dataSource() throws IOException {
        Path dataDir = Files.createTempDirectory("ffl-test-pg");
        EmbeddedPostgres pg = EmbeddedPostgres.builder()
                .setPort(15434)
                .setDataDirectory(dataDir.toFile())
                .setCleanDataDirectory(true)
                .start();
        return pg.getPostgresDatabase();
    }
}
