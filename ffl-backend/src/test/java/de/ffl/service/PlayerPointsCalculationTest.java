package de.ffl.service;

import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Round;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerPointsCalculationTest extends AbstractSeasonTestBase {

    private Player harryKane;
    private Player manuelNeuer;
    private Player kevinDiks;
    private Player kramaric;

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();

        harryKane = findPlayerByName("Harry Kane");
        manuelNeuer = findPlayerByName("Manuel Neuer");
        kevinDiks = findPlayerByName("Kevin Diks");
        kramaric = findPlayerByName("Andrej Kramaric");

        seasonCalculationService.calculateSeason(season.getId());
    }

    @Test
    void harryKane_shouldHave108TotalPoints() {
        Round round34 = roundMap.get(34);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                harryKane.getId(), round34.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(108);
    }

    @Test
    void harryKane_shouldHave9PointsInRound1() {
        Round round1 = roundMap.get(1);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                harryKane.getId(), round1.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsRound()).isEqualTo(9);
    }

    @Test
    void manuelNeuer_shouldHave35TotalPoints() {
        Round round34 = roundMap.get(34);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                manuelNeuer.getId(), round34.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(35);
    }

    @Test
    void manuelNeuer_shouldHave5PointsInRound1_cleanSheet() {
        Round round1 = roundMap.get(1);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                manuelNeuer.getId(), round1.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsRound()).isEqualTo(5);
    }

    @Test
    void kevinDiks_shouldHave59TotalPoints() {
        Round round34 = roundMap.get(34);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                kevinDiks.getId(), round34.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(59);
    }

    @Test
    void kevinDiks_shouldHave2PointsInRound1_cleanSheet() {
        Round round1 = roundMap.get(1);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                kevinDiks.getId(), round1.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsRound()).isEqualTo(2);
    }

    @Test
    void kramaric_shouldHave70TotalPoints() {
        Round round34 = roundMap.get(34);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                kramaric.getId(), round34.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(70);
    }

    @Test
    void goalScoringRules_strikerGets3PerGoal() {
        Round round1 = roundMap.get(1);
        Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                harryKane.getId(), round1.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsRound()).isEqualTo(9);
    }

    @Test
    void harryKane_pointsAccumulateCorrectlyAcrossRounds() {
        int[] expectedPerRound = {9, 0, 6, 9, 6, 3, 3, 0, 0, 3, 3, 0, 9, 3, 3, 3, 0, 3, 0, 3, 6, 6, 6, 6, 0, 0, 3, 0, 0, 3, 3, 0, 0, 9};

        for (int i = 0; i < 34; i++) {
            Round round = roundMap.get(i + 1);
            Optional<PlayerRank> rank = playerRankRepository.findByPlayerIdAndRoundId(
                    harryKane.getId(), round.getId());
            assertThat(rank).isPresent();
            assertThat(rank.get().getPointsRound())
                    .as("Harry Kane Spieltag %d", i + 1)
                    .isEqualTo(expectedPerRound[i]);
        }
    }

    private Player findPlayerByName(String name) {
        return playerMap.values().stream()
                .filter(p -> p.getNameKicker().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + name));
    }
}
