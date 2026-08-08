package de.ffl.migration;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.Team;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.TeamRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NewSeasonSetupUpdatePlayersTest {

    @Autowired
    private NewSeasonSetupService setupService;

    @SpyBean
    private KickerClientDatabaseClient databaseClient;

    @Autowired
    private SeasonRepository seasonRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private EntityManager entityManager;

    private Season season;
    private Team alpha;
    private Team beta;

    @BeforeEach
    void setUp() throws Exception {
        try (InputStream is = getClass().getClassLoader().getResourceAsStream("testdata/kicker_new_season_test.json")) {
            assertThat(is).isNotNull();
            String json = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            KickerClientDatabase db = databaseClient.parseDatabase(json);
            doReturn(db).when(databaseClient).loadDatabase(anyString());
        }

        season = seasonRepository.save(Season.builder()
                .name("2026/27")
                .budget(30000000)
                .seasonState(SeasonState.BEFORE_SEASON)
                .build());

        alpha = teamRepository.save(Team.builder()
                .name("Testverein Alpha")
                .shortName("Alpha")
                .kickerId("tm-k00000001")
                .build());
        beta = teamRepository.save(Team.builder()
                .name("Testverein Beta")
                .shortName("Beta")
                .kickerId("tm-k00000002")
                .build());
        Set<Team> teams = new HashSet<>();
        teams.add(alpha);
        teams.add(beta);
        season.setTeams(teams);
        season = seasonRepository.save(season);

        List<Team> alphaTeams = new ArrayList<>();
        alphaTeams.add(alpha);
        playerRepository.save(Player.builder()
                .kickerId("pl-test-gk-01")
                .nameKicker("Mustermann")
                .firstName("Max")
                .lastName("Mustermann")
                .position(Position.GOALKEEPER)
                .prize(1000000)
                .season(season)
                .teams(alphaTeams)
                .build());

        List<Team> betaTeams = new ArrayList<>();
        betaTeams.add(beta);
        playerRepository.save(Player.builder()
                .kickerId("pl-test-df-01")
                .nameKicker("Abwehr")
                .firstName("Daniel")
                .lastName("Abwehr")
                .position(Position.DEFENDER)
                .prize(800000)
                .season(season)
                .teams(betaTeams)
                .build());

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void updatePlayers_beforeSeason_addsNewPlayersAndAppliesTeamChanges() {
        AtomicReference<String> log = new AtomicReference<>("");
        NewSeasonSetupService.UpdateResult result = setupService.updatePlayers("test-url", msg -> log.set(log.get() + msg + "\n"));

        assertThat(result.playersCreated()).isEqualTo(8);
        assertThat(playerRepository.findBySeasonId(season.getId())).hasSize(10);

        assertThat(result.teamChanges()).isEqualTo(1);
        Player df01 = playerRepository.findBySeasonIdWithTeams(season.getId()).stream()
                .filter(p -> "pl-test-df-01".equals(p.getKickerId()))
                .findFirst().orElseThrow();
        assertThat(df01.getTeams()).hasSize(1);
        assertThat(df01.getTeams().get(0).getName()).isEqualTo("Testverein Alpha");

        Player gk01 = playerRepository.findBySeasonIdWithTeams(season.getId()).stream()
                .filter(p -> "pl-test-gk-01".equals(p.getKickerId()))
                .findFirst().orElseThrow();
        assertThat(gk01.getTeams().get(0).getName()).isEqualTo("Testverein Alpha");

        assertThat(log.get()).contains("=== Spieler-Update abgeschlossen ===");
        assertThat(log.get()).contains("Neue Spieler angelegt: 8");
        assertThat(log.get()).contains("Vereinswechsel aktualisiert: 1");
        assertThat(log.get()).doesNotContain("Neue Vereine angelegt");
    }

    @Test
    void updatePlayers_runningSeason_addsNewPlayersButSkipsTeamChanges() {
        season.setSeasonState(SeasonState.RUNNING_HINRUNDE);
        seasonRepository.save(season);
        entityManager.flush();
        entityManager.clear();

        AtomicReference<String> log = new AtomicReference<>("");
        NewSeasonSetupService.UpdateResult result = setupService.updatePlayers("test-url", msg -> log.set(log.get() + msg + "\n"));

        assertThat(result.playersCreated()).isEqualTo(8);
        assertThat(result.teamChanges()).isEqualTo(0);

        Player df01 = playerRepository.findBySeasonIdWithTeams(season.getId()).stream()
                .filter(p -> "pl-test-df-01".equals(p.getKickerId()))
                .findFirst().orElseThrow();
        assertThat(df01.getTeams().get(0).getName()).isEqualTo("Testverein Beta");

        assertThat(log.get()).contains("Vereinswechsel aktualisiert: 0 (nur im Status 'Vor Saison')");
    }

    @Test
    void updatePlayers_skipsPlayersWithoutMatchingTeam() {
        AtomicReference<String> log = new AtomicReference<>("");
        NewSeasonSetupService.UpdateResult result = setupService.updatePlayers("test-url", msg -> log.set(log.get() + msg + "\n"));

        assertThat(playerRepository.findBySeasonId(season.getId()))
                .filteredOn(p -> "pl-test-st-03".equals(p.getKickerId())
                        || "pl-test-df-04".equals(p.getKickerId())
                        || "pl-test-gk-03".equals(p.getKickerId()))
                .isEmpty();
        assertThat(log.get()).contains("übersprungen");
    }

    @Test
    void updatePlayers_backfillsKickerIdFromLogoUrl() {
        Team legacy = teamRepository.save(Team.builder()
                .name("Testverein Alpha")
                .shortName("Alpha")
                .logoSUrl("https://sportsfeed.kicker.de/MediaService/TeamLogo?teamId=1&width=140")
                .build());
        Set<Team> teams = new HashSet<>(season.getTeams());
        teams.add(legacy);
        season.setTeams(teams);
        seasonRepository.save(season);
        entityManager.flush();
        entityManager.clear();

        AtomicReference<String> log = new AtomicReference<>("");
        setupService.updatePlayers("test-url", msg -> log.set(log.get() + msg + "\n"));

        Team reloaded = teamRepository.findById(legacy.getId()).orElseThrow();
        assertThat(reloaded.getKickerId()).isEqualTo("tm-k00000001");
        assertThat(log.get()).contains("kickerId ergänzt");
    }

    @Test
    void updatePlayers_deactivatesPlayersNoLongerInActiveKickerData() {
        List<Team> alphaTeams = new ArrayList<>();
        alphaTeams.add(alpha);
        playerRepository.save(Player.builder()
                .kickerId("pl-test-gone-01")
                .nameKicker("Wegfallender Spieler")
                .position(Position.DEFENDER)
                .prize(500000)
                .season(season)
                .teams(alphaTeams)
                .aktiv(true)
                .build());
        entityManager.flush();
        entityManager.clear();

        AtomicReference<String> log = new AtomicReference<>("");
        NewSeasonSetupService.UpdateResult result = setupService.updatePlayers("test-url", msg -> log.set(log.get() + msg + "\n"));

        assertThat(result.playersDeactivated()).isEqualTo(1);
        Player gone = playerRepository.findBySeasonIdWithTeams(season.getId()).stream()
                .filter(p -> "pl-test-gone-01".equals(p.getKickerId()))
                .findFirst().orElseThrow();
        assertThat(gone.getAktiv()).isFalse();
        assertThat(log.get()).contains("Spieler deaktiviert: Wegfallender Spieler");
        assertThat(log.get()).contains("Spieler deaktiviert: 1");
    }

    @Test
    void updatePlayers_reactivatesPlayersBackInActiveKickerData() {
        List<Team> alphaTeams = new ArrayList<>();
        alphaTeams.add(alpha);
        playerRepository.save(Player.builder()
                .kickerId("pl-test-gk-01")
                .nameKicker("Mustermann")
                .firstName("Max")
                .lastName("Mustermann")
                .position(Position.GOALKEEPER)
                .prize(1000000)
                .season(season)
                .teams(alphaTeams)
                .aktiv(false)
                .build());
        entityManager.flush();
        entityManager.clear();

        AtomicReference<String> log = new AtomicReference<>("");
        setupService.updatePlayers("test-url", msg -> log.set(log.get() + msg + "\n"));

        Player gk01 = playerRepository.findBySeasonIdWithTeams(season.getId()).stream()
                .filter(p -> "pl-test-gk-01".equals(p.getKickerId()))
                .findFirst().orElseThrow();
        assertThat(gk01.getAktiv()).isTrue();
        assertThat(log.get()).contains("Spieler reaktiviert: Mustermann");
    }
}
