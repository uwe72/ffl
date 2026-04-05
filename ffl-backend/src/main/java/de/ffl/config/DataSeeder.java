package de.ffl.config;

import de.ffl.domain.*;
import de.ffl.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.time.LocalDate;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(
            UserRepository userRepository,
            SeasonRepository seasonRepository,
            TeamRepository teamRepository,
            PlayerRepository playerRepository,
            PasswordEncoder passwordEncoder,
            DataSource dataSource
    ) {
        return args -> {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE ffl_player ALTER COLUMN id RESTART WITH (SELECT COALESCE(MAX(id), 0) + 1 FROM ffl_player)");
            } catch (Exception ignored) {}
            
            if (userRepository.count() == 0) {
                User admin = User.builder()
                        .login("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .email("admin@ffl.de")
                        .firstName("Admin")
                        .lastName("User")
                        .role(UserRole.ADMIN)
                        .build();
                userRepository.save(admin);

                User user1 = User.builder()
                        .login("uwe")
                        .password(passwordEncoder.encode("password"))
                        .email("uwe@ffl.de")
                        .firstName("Uwe")
                        .lastName("Manager")
                        .role(UserRole.NORMAL)
                        .build();
                userRepository.save(user1);
            }

            if (teamRepository.count() == 0) {
                createTeams(teamRepository);
            }

            if (seasonRepository.count() == 0) {
                createSeason(seasonRepository, teamRepository);
            }

            if (playerRepository.count() == 0) {
                createPlayers(playerRepository, teamRepository, seasonRepository);
            }
        };
    }

    private void createTeams(TeamRepository teamRepository) {
        String[] teamNames = {
                "Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen",
                "VfB Stuttgart", "Eintracht Frankfurt", "VfL Wolfsburg", "Borussia M'gladbach",
                "SC Freiburg", "1. FC Union Berlin", "TSG Hoffenheim", "1. FSV Mainz 05",
                "FC Augsburg", "Werder Bremen", "VfL Bochum", "1. FC Köln",
                "Darmstadt 98", "Heidenheim"
        };

        for (String name : teamNames) {
            Team team = Team.builder()
                    .name(name)
                    .shortName(name.substring(0, 3).toUpperCase())
                    .build();
            teamRepository.save(team);
        }
    }

    private void createSeason(SeasonRepository seasonRepository, TeamRepository teamRepository) {
        Season season = Season.builder()
                .name("2024/25")
                .budget(30000000)
                .seasonState(SeasonState.RUNNING_HINRUNDE)
                .finalRegistrationDate(LocalDate.of(2024, 8, 15))
                .build();
        seasonRepository.save(season);
    }

    private void createPlayers(PlayerRepository playerRepository, TeamRepository teamRepository, SeasonRepository seasonRepository) {
        Season season = seasonRepository.findAll().get(0);
        
        Object[][] players = {
                {"Neuer M.", Position.GOALKEEPER, 5000000},
                {"Sommer Y.", Position.GOALKEEPER, 4000000},
                {"Ter Stegen M.-A.", Position.GOALKEEPER, 4500000},
                {"Kimmich J.", Position.DEFENDER, 8000000},
                {"Rüdiger A.", Position.DEFENDER, 4000000},
                {"Schlotterbeck N.", Position.DEFENDER, 3500000},
                {"Tah J.", Position.DEFENDER, 4000000},
                {"Musiala J.", Position.MIDFIELD, 12000000},
                {"Wirtz F.", Position.MIDFIELD, 13000000},
                {"Sané L.", Position.MIDFIELD, 8000000},
                {"Brandt J.", Position.MIDFIELD, 4000000},
                {"Guirassy S.", Position.STRIKER, 9000000},
                {"Kane H.", Position.STRIKER, 10000000},
                {"Füllkrug N.", Position.STRIKER, 6000000},
        };

        for (Object[] p : players) {
            Player player = Player.builder()
                    .nameKicker((String) p[0])
                    .position((Position) p[1])
                    .prize((Integer) p[2])
                    .season(season)
                    .build();
            playerRepository.save(player);
        }
    }
}