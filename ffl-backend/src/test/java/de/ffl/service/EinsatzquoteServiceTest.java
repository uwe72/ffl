package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Round;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.Team;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.GameRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.RoundRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.TeamRepository;
import de.ffl.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EinsatzquoteServiceTest {

    @Autowired
    private SeasonRepository seasonRepository;
    @Autowired
    private TeamRepository teamRepository;
    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private RoundRepository roundRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private ManagerRepository managerRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private SeasonCalculationService seasonCalculationService;
    @Autowired
    private EntityManager entityManager;

    @Test
    void calculateSeason_shouldComputeEinsatzquoten() {
        Season season = Season.builder()
                .name("2025/26")
                .budget(30000000)
                .seasonState(SeasonState.RUNNING_HINRUNDE)
                .startRoundRueckrunde(16)
                .build();
        season = seasonRepository.save(season);

        Team t1 = teamRepository.save(Team.builder().name("T1").shortName("T1").build());
        Team t2 = teamRepository.save(Team.builder().name("T2").shortName("T2").build());
        Team t3 = teamRepository.save(Team.builder().name("T3").shortName("T3").build());
        Team t4 = teamRepository.save(Team.builder().name("T4").shortName("T4").build());
        season.setTeams(new HashSet<>(java.util.List.of(t1, t2, t3, t4)));
        season = seasonRepository.save(season);

        Player p1 = player(season, t1, "Alpha");
        Player p2 = player(season, t2, "Beta");
        Player p3 = player(season, t3, "Gamma");
        Player p4 = player(season, t4, "Delta");

        Round r1 = roundRepository.save(Round.builder().number(1).season(season).build());
        Round r2 = roundRepository.save(Round.builder().number(2).season(season).build());

        gameRepository.save(game(r1, t1, t2, formation("Alpha", "Beta")));
        gameRepository.save(game(r1, t3, t4, formation("Gamma", "Delta")));

        gameRepository.save(game(r2, t1, t3, formation("Alpha", null)));
        gameRepository.save(game(r2, t2, t4, formation("Beta", "Delta")));

        User user = User.builder()
                .login("uwe72")
                .password("$2a$10$test")
                .email("test@test.de")
                .firstName("Uwe")
                .lastName("Sieben")
                .role(UserRole.NORMAL)
                .build();
        user = userRepository.save(user);

        Manager manager = Manager.builder().user(user).season(season).budget(10000000).build();
        manager.setPlayerGoalkeeper(p1);
        manager.setPlayerDefender1(p3);
        manager = managerRepository.save(manager);

        entityManager.flush();
        entityManager.clear();

        seasonCalculationService.calculateSeason(season.getId());

        Team nt1 = teamRepository.findById(t1.getId()).orElseThrow();
        assertThat(nt1.getPlayers()).extracting(Player::getNameKicker).contains("Alpha");

        season = seasonRepository.findById(season.getId()).orElseThrow();
        assertThat(season.getCurrentMatchday()).isEqualTo(2);

        assertThat(playerRepository.findById(p1.getId()).orElseThrow().getEinsatzquote()).isEqualTo(100);
        assertThat(playerRepository.findById(p2.getId()).orElseThrow().getEinsatzquote()).isEqualTo(100);
        assertThat(playerRepository.findById(p3.getId()).orElseThrow().getEinsatzquote()).isEqualTo(50);
        assertThat(playerRepository.findById(p4.getId()).orElseThrow().getEinsatzquote()).isEqualTo(100);

        assertThat(managerRepository.findById(manager.getId()).orElseThrow().getEinsatzquote()).isEqualTo(75);
    }

    @Test
    void calculateSeason_shouldCountPartiallyEnteredRounds() {
        Season season = Season.builder()
                .name("2025/26")
                .budget(30000000)
                .seasonState(SeasonState.RUNNING_HINRUNDE)
                .startRoundRueckrunde(16)
                .build();
        season = seasonRepository.save(season);

        Team t1 = teamRepository.save(Team.builder().name("T1").shortName("T1").build());
        Team t2 = teamRepository.save(Team.builder().name("T2").shortName("T2").build());
        Team t3 = teamRepository.save(Team.builder().name("T3").shortName("T3").build());
        Team t4 = teamRepository.save(Team.builder().name("T4").shortName("T4").build());
        season.setTeams(new HashSet<>(java.util.List.of(t1, t2, t3, t4)));
        season = seasonRepository.save(season);

        Player p1 = player(season, t1, "Alpha");
        Player p2 = player(season, t2, "Beta");
        Player p3 = player(season, t3, "Gamma");
        Player p4 = player(season, t4, "Delta");

        Round r1 = roundRepository.save(Round.builder().number(1).season(season).build());
        Round r2 = roundRepository.save(Round.builder().number(2).season(season).build());

        gameRepository.save(game(r1, t1, t2, formation("Alpha", "Beta")));
        gameRepository.save(unenteredGame(r1, t3, t4));

        gameRepository.save(game(r2, t1, t3, formation(null, "Gamma")));
        gameRepository.save(game(r2, t2, t4, formation("Beta", "Delta")));

        User user = User.builder()
                .login("uwe72")
                .password("$2a$10$test")
                .email("test@test.de")
                .firstName("Uwe")
                .lastName("Sieben")
                .role(UserRole.NORMAL)
                .build();
        user = userRepository.save(user);

        Manager manager = Manager.builder().user(user).season(season).budget(10000000).build();
        manager.setPlayerGoalkeeper(p1);
        manager.setPlayerDefender1(p3);
        manager = managerRepository.save(manager);

        entityManager.flush();
        entityManager.clear();

        seasonCalculationService.calculateSeason(season.getId());

        assertThat(playerRepository.findById(p1.getId()).orElseThrow().getEinsatzquote()).isEqualTo(50);
        assertThat(playerRepository.findById(p2.getId()).orElseThrow().getEinsatzquote()).isEqualTo(100);
        assertThat(playerRepository.findById(p3.getId()).orElseThrow().getEinsatzquote()).isEqualTo(100);
        assertThat(playerRepository.findById(p4.getId()).orElseThrow().getEinsatzquote()).isEqualTo(100);

        assertThat(managerRepository.findById(manager.getId()).orElseThrow().getEinsatzquote()).isEqualTo(67);
    }

    private Player player(Season season, Team team, String name) {
        Player player = Player.builder()
                .nameKicker(name)
                .position(Position.MIDFIELD)
                .prize(1000000)
                .aktiv(true)
                .season(season)
                .teams(new ArrayList<>())
                .build();
        player.getTeams().add(team);
        return playerRepository.save(player);
    }

    private Game game(Round round, Team host, Team visitor, String formation) {
        return Game.builder()
                .name(host.getShortName() + " - " + visitor.getShortName())
                .round(round)
                .host(host)
                .visitor(visitor)
                .formation(formation)
                .formationExtern(formation)
                .build();
    }

    private Game unenteredGame(Round round, Team host, Team visitor) {
        return Game.builder()
                .name(host.getShortName() + " - " + visitor.getShortName())
                .round(round)
                .host(host)
                .visitor(visitor)
                .build();
    }

    private String formation(String hostPlayer, String visitorPlayer) {
        String[] names = new String[22];
        for (int i = 0; i < 22; i++) {
            names[i] = "Filler" + i;
        }
        if (hostPlayer != null) names[0] = hostPlayer;
        if (visitorPlayer != null) names[11] = visitorPlayer;
        return "Aufstellung_LB_" + String.join("_LB_", names) + "_LB_Trainer_LB_Coach_LB_";
    }
}
