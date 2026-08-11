package de.ffl.migration;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.PrizeDistributionLog;
import de.ffl.domain.PrizePayout;
import de.ffl.domain.PayoutStatus;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.Team;
import de.ffl.domain.UserRole;
import de.ffl.repository.GameRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.PrizeDistributionLogRepository;
import de.ffl.repository.PrizePayoutRepository;
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
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;

@ActiveProfiles("test")
class NewSeasonSetupServiceTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

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
    private RoundRepository roundRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PrizePayoutRepository prizePayoutRepository;

    @Autowired
    private PrizeDistributionLogRepository prizeDistributionLogRepository;

    @BeforeEach
    void setUp() throws Exception {
        prizePayoutRepository.save(PrizePayout.builder()
                .manager(managerUwe72)
                .season(season)
                .position(1)
                .pointsTotal(100)
                .prizeAmount(BigDecimal.valueOf(50.0))
                .payoutStatus(PayoutStatus.UNPAID)
                .calculatedAt(LocalDateTime.now())
                .build());
        prizeDistributionLogRepository.save(PrizeDistributionLog.builder()
                .season(season)
                .totalParticipants(1)
                .payingParticipants(1)
                .totalStakes(BigDecimal.TEN)
                .serverCosts(BigDecimal.TEN)
                .totalBudget(BigDecimal.TEN)
                .numWinningRanks(1)
                .prizeFirstPlace(BigDecimal.TEN)
                .prizeLastPlace(BigDecimal.ONE)
                .curvatureFactor(1.0)
                .statisticsHtml("<p>test</p>")
                .basePrizes("[10]")
                .calculatedAt(LocalDateTime.now())
                .build());
        entityManager.flush();
        entityManager.clear();

        try (InputStream is = getClass().getClassLoader().getResourceAsStream("testdata/kicker_new_season_test.json")) {
            assertThat(is).isNotNull();
            final byte[] bytes = is.readAllBytes();
            final String json = new String(bytes, StandardCharsets.UTF_8);
            final KickerClientDatabase db = databaseClient.parseDatabase(json);
            doReturn(db).when(databaseClient).loadDatabase(anyString());
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
        assertThat(playerRepository.findBySeasonId(newSeason.getId()))
                .allSatisfy(p -> assertThat(p.getPictureUrl()).isNotBlank());
        assertThat(playerRepository.findBySeasonId(newSeason.getId()))
                .filteredOn(p -> !"pl-test-gk-03".equals(p.getKickerId()))
                .allSatisfy(p -> assertThat(p.getPictureUrl())
                        .isEqualTo("https://derivates.kicker.de/image/upload/test/" + p.getKickerId() + ".png"));
        Player gkWithoutSeasonImage = playerRepository.findBySeasonId(newSeason.getId()).stream()
                .filter(p -> "pl-test-gk-03".equals(p.getKickerId()))
                .findFirst().orElseThrow();
        assertThat(gkWithoutSeasonImage.getPictureUrl())
                .isEqualTo("https://sportsfeed.kicker.de/MediaService/PlayerLogo?playerId=99903&width=290&teamId=3");

        Team alpha = teamRepository.findByName("Testverein Alpha").orElseThrow();
        assertThat(alpha.getShortName()).isEqualTo("Alpha");
        assertThat(alpha.getLogoSUrl()).isEqualTo("https://sportsfeed.kicker.de/MediaService/TeamLogo?teamId=1&width=140");
        assertThat(alpha.getLogoXxlUrl()).isEqualTo("https://sportsfeed.kicker.de/MediaService/TeamLogo?teamId=1&width=290");

        assertThat(gameRepository.findByRoundSeasonId(newSeason.getId())).hasSize(3);

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
        assertThat(preview.gamesTotal()).isEqualTo(3);
        assertThat(preview.playersPerPosition().get("GOALKEEPER")).isEqualTo(3);
        assertThat(preview.playersPerPosition().get("DEFENDER")).isEqualTo(4);
        assertThat(preview.playersPerPosition().get("MIDFIELD")).isEqualTo(3);
        assertThat(preview.playersPerPosition().get("STRIKER")).isEqualTo(3);
        assertThat(preview.teamBreakdown()).hasSize(3);
    }

    @Test
    void setup_skipsPlayersWithUnknownMarketValue() {
        AtomicReference<String> log = new AtomicReference<>("");
        Season newSeason = setupService.setup("test-url", "2026/27", msg ->
                log.set(log.get() + msg + "\n"));

        assertThat(playerRepository.findBySeasonId(newSeason.getId()))
                .filteredOn(p -> "pl-test-df-sentinel".equals(p.getKickerId()))
                .isEmpty();
        assertThat(log.get()).contains("Spieler übersprungen (Marktwert unbekannt): Sentinel (Testverein Alpha)");
        assertThat(log.get()).contains("Spieler mit unbekanntem Marktwert übersprungen: 1");
    }
}