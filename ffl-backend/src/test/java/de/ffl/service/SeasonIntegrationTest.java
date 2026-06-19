package de.ffl.service;

import de.ffl.domain.ManagerRank;
import de.ffl.domain.Round;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class SeasonIntegrationTest extends AbstractSeasonTestBase {

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();
    }

    @Test
    void calculateSeason_shouldComputeCorrectTotalPointsForManager() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round34 = roundMap.get(34);
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round34.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(390);
    }

    @Test
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
    void calculateSeason_shouldComputeCorrectPointsBeforeTransferRound() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round15 = roundMap.get(15);
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round15.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(147);
    }

    @Test
    void calculateSeason_shouldComputeCorrectPointsAtTransferRound() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round16 = roundMap.get(16);
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round16.getId());

        assertThat(rank).isPresent();
        assertThat(rank.get().getPointsTotal()).isEqualTo(164);
    }

    @Test
    void calculateSeason_shouldSetCurrentMatchday() {
        seasonCalculationService.calculateSeason(season.getId());

        season = seasonRepository.findById(season.getId()).orElseThrow();
        assertThat(season.getCurrentMatchday()).isEqualTo(34);
    }
}
