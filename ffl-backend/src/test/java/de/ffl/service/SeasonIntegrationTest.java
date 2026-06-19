package de.ffl.service;

import de.ffl.domain.*;
import org.junit.jupiter.api.*;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SeasonIntegrationTest extends AbstractSeasonTestBase {

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();
    }

    @Test
    @Order(1)
    void calculateSeason_shouldComputeCorrectTotalPointsForManager() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round34 = roundMap.get(34);
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round34.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(390);
    }

    @Test
    @Order(2)
    void calculateSeason_shouldComputeCorrectPerRoundPoints() {
        seasonCalculationService.calculateSeason(season.getId());

        int[] expectedPerRound = {13, 6, 21, 9, 15, 5, 5, 15, 17, 13, 0, 9, 9, 7, 3, 17, 22, 2, 0, 10, 12, 25, 10, 14, 13, 9, 18, 11, 15, 16, 9, 26, 0, 14};

        List<ManagerRank> ranks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(managerUwe72.getId());
        assertThat(ranks).hasSize(34);

        for (int i = 0; i < 34; i++) {
            assertThat(ranks.get(i).getPointsRound())
                    .as("Spieltag %d", i + 1)
                    .isEqualTo(expectedPerRound[i]);
        }
    }

    @Test
    @Order(3)
    void calculateSeason_shouldComputeCorrectPointsBeforeTransferRound() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round15 = roundMap.get(15);
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round15.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(147);
    }

    @Test
    @Order(4)
    void calculateSeason_shouldComputeCorrectPointsAtTransferRound() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round16 = roundMap.get(16);
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round16.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(164);
    }

    @Test
    @Order(5)
    void calculateSeason_shouldSetCurrentMatchday() {
        seasonCalculationService.calculateSeason(season.getId());

        season = seasonRepository.findById(season.getId()).orElseThrow();
        assertThat(season.getCurrentMatchday()).isEqualTo(34);
    }

    @Test
    @Order(Integer.MAX_VALUE)
    void printTestSummary() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round34 = roundMap.get(34);
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round34.getId());
        int managerActual = rank.map(ManagerRank::getPointsTotal).orElse(-1);

        String[] playerNames = {"Harry Kane", "Manuel Neuer", "Kevin Diks"};
        int[] playerExpected = {108, 35, 59};

        System.out.println();
        System.out.println("=== Test Summary ===");
        System.out.printf("Manager uwe72: expected=390, actual=%d%n", managerActual);

        for (int i = 0; i < playerNames.length; i++) {
            String name = playerNames[i];
            int expected = playerExpected[i];
            int actual = findPlayerPointsByName(name, round34.getId());
            System.out.printf("%-14s expected=%-3d, actual=%d%n", name + ":", expected, actual);
        }
        System.out.println();
    }

    private int findPlayerPointsByName(String name, Long roundId) {
        return playerMap.values().stream()
                .filter(p -> name.equals(p.getNameKicker()))
                .findFirst()
                .flatMap(p -> playerRankRepository.findByPlayerIdAndRoundId(p.getId(), roundId))
                .map(PlayerRank::getPointsTotal)
                .orElse(-1);
    }
}
