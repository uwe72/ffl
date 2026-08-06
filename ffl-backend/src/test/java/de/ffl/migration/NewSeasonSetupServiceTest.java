package de.ffl.migration;

import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.UserRole;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.RoundRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.TeamRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.AbstractSeasonTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;

@ActiveProfiles("test")
class NewSeasonSetupServiceTest extends AbstractSeasonTestBase {

    @Autowired
    private NewSeasonSetupService setupService;

    @SpyBean
    private KickerPlayerCsvClient csvClient;

    @Autowired
    private SeasonRepository seasonRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private RoundRepository roundRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();

        try (InputStream is = getClass().getClassLoader().getResourceAsStream("testdata/kicker_new_season_test.csv")) {
            assertThat(is).isNotNull();
            final byte[] bytes = is.readAllBytes();
            final String csv = new String(bytes, StandardCharsets.UTF_8);
            final List<KickerPlayerCsvRow> rows = csvClient.parseCsv(csv);
            doReturn(rows).when(csvClient).loadCsv(anyString());
        }
    }

    @Test
    void setup_createsNewSeasonAndDeletesOldData() {
        Long oldSeasonId = season.getId();
        long oldUserCount = userRepository.count();

        AtomicReference<String> log = new AtomicReference<>("");
        Season newSeason = setupService.setup("test-url", "2026/27", msg ->
                log.set(log.get() + msg + "\n"));

        assertThat(newSeason.getName()).isEqualTo("2026/27");
        assertThat(newSeason.getSeasonState()).isEqualTo(SeasonState.BEFORE_SEASON);
        assertThat(seasonRepository.findById(oldSeasonId)).isEmpty();
        assertThat(seasonRepository.findAll()).hasSize(1);
        assertThat(roundRepository.findBySeasonId(newSeason.getId())).hasSize(34);
        assertThat(teamRepository.findAll()).hasSize(3);
        assertThat(teamRepository.findByName("Testverein Alpha")).isPresent();
        assertThat(teamRepository.findByName("Testverein Beta")).isPresent();
        assertThat(teamRepository.findByName("Testverein Gamma")).isPresent();
        assertThat(playerRepository.findBySeasonId(newSeason.getId())).hasSize(13);
        assertThat(playerRepository.findBySeasonAndPosition(newSeason, Position.GOALKEEPER)).hasSize(3);
        assertThat(playerRepository.findBySeasonAndPosition(newSeason, Position.DEFENDER)).hasSize(4);
        assertThat(playerRepository.findBySeasonAndPosition(newSeason, Position.MIDFIELD)).hasSize(3);
        assertThat(playerRepository.findBySeasonAndPosition(newSeason, Position.STRIKER)).hasSize(3);

        long remainingUsers = userRepository.count();
        assertThat(remainingUsers).isLessThan(oldUserCount);
        assertThat(userRepository.findAll().stream().noneMatch(u -> u.getRole() != UserRole.ADMIN)).isTrue();

        assertThat(log.get()).contains("=== Archiv");
        assertThat(log.get()).contains("Setup abgeschlossen");
    }

    @Test
    void preview_returnsCorrectCounts() {
        SetupPreviewDto preview = setupService.preview("test-url");

        assertThat(preview.teamCount()).isEqualTo(3);
        assertThat(preview.playersTotal()).isEqualTo(13);
        assertThat(preview.playersPerPosition().get("GOALKEEPER")).isEqualTo(3);
        assertThat(preview.playersPerPosition().get("DEFENDER")).isEqualTo(4);
        assertThat(preview.playersPerPosition().get("MIDFIELD")).isEqualTo(3);
        assertThat(preview.playersPerPosition().get("STRIKER")).isEqualTo(3);
        assertThat(preview.teamBreakdown()).hasSize(3);
    }
}