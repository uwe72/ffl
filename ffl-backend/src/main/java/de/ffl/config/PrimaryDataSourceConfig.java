package de.ffl.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
@ConditionalOnProperty(name = "spring.profiles.active", havingValue = "docker")
public class PrimaryDataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource() {
        return DataSourceBuilder.create()
            .url(System.getProperty("spring.datasource.url", "jdbc:postgresql://postgres:5432/fflng"))
            .username(System.getProperty("spring.datasource.username", "admin"))
            .password(System.getProperty("spring.datasource.password", "fflng347"))
            .build();
    }

    @Bean
    @Primary
    public JdbcTemplate jdbcTemplate() {
        return new JdbcTemplate(dataSource());
    }
}
