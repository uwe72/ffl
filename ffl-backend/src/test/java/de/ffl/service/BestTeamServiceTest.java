package de.ffl.service;

import de.ffl.dto.BestTeamResult;
import de.ffl.dto.BestTeamResult.BestTeamPlayer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class BestTeamServiceTest extends AbstractSeasonTestBase {

    @Autowired
    private BestTeamService bestTeamService;

    private BestTeamResult bestTeam;

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();
        seasonCalculationService.calculateSeason(season.getId());
        bestTeam = bestTeamService.getBestTeam(season.getId());
    }

    @Test
    void calculateSeason_shouldPersistBestTeam() {
        assertThat(bestTeam).isNotNull();
        assertThat(bestTeam.getPlayers()).hasSize(11);
    }

    @Test
    void bestTeam_shouldHaveExactlyOneGoalkeeper() {
        long gkCount = bestTeam.getPlayers().stream()
            .filter(p -> "GOALKEEPER".equals(p.getPosition()))
            .count();
        assertThat(gkCount).isEqualTo(1);
    }

    @Test
    void bestTeam_shouldHaveValidFormation() {
        Map<String, Long> positionCounts = bestTeam.getPlayers().stream()
            .collect(Collectors.groupingBy(BestTeamPlayer::getPosition, Collectors.counting()));

        long defCount = positionCounts.getOrDefault("DEFENDER", 0L);
        long midCount = positionCounts.getOrDefault("MIDFIELD", 0L);
        long strCount = positionCounts.getOrDefault("STRIKER", 0L);

        assertThat(defCount).isBetween(3L, 4L);
        assertThat(midCount).isBetween(3L, 4L);
        assertThat(strCount).isBetween(3L, 4L);
        assertThat(defCount + midCount + strCount).isEqualTo(10);
    }

    @Test
    void bestTeam_shouldRespectBudget() {
        assertThat(bestTeam.getTotalCost()).isLessThanOrEqualTo(bestTeam.getBudget());

        long sumPrize = bestTeam.getPlayers().stream()
            .mapToLong(BestTeamPlayer::getPrize)
            .sum();
        assertThat(sumPrize).isEqualTo(bestTeam.getTotalCost());
    }

    @Test
    void bestTeam_shouldRespectMaxFivePlayersPerClub() {
        Map<String, Long> clubCounts = bestTeam.getPlayers().stream()
            .filter(p -> p.getTeamName() != null && !p.getTeamName().isEmpty())
            .collect(Collectors.groupingBy(BestTeamPlayer::getTeamName, Collectors.counting()));

        for (Map.Entry<String, Long> entry : clubCounts.entrySet()) {
            assertThat(entry.getValue())
                .as("Club %s should have at most 5 players", entry.getKey())
                .isLessThanOrEqualTo(5);
        }
    }

    @Test
    void bestTeam_shouldHaveAllUniquePlayers() {
        List<Long> ids = bestTeam.getPlayers().stream()
            .map(BestTeamPlayer::getId)
            .collect(Collectors.toList());
        assertThat(ids).doesNotHaveDuplicates();
    }

    @Test
    void bestTeam_shouldHaveExactlyOneFreeChoice() {
        long freeChoiceCount = bestTeam.getPlayers().stream()
            .filter(BestTeamPlayer::isFreeChoice)
            .count();
        assertThat(freeChoiceCount).isEqualTo(1);
    }

    @Test
    void bestTeam_shouldHavePositivePoints() {
        assertThat(bestTeam.getTotalPoints()).isGreaterThan(0);
        for (BestTeamPlayer player : bestTeam.getPlayers()) {
            assertThat(player.getPoints()).isGreaterThan(0);
        }
    }

    @Test
    void bestTeam_formationShouldMatchPlayerCounts() {
        String formation = bestTeam.getFormation();
        assertThat(formation).matches("1-[34]-[34]-[34]");

        String[] parts = formation.split("-");
        int expectedGk = Integer.parseInt(parts[0]);
        int expectedDef = Integer.parseInt(parts[1]);
        int expectedMid = Integer.parseInt(parts[2]);
        int expectedStr = Integer.parseInt(parts[3]);

        Map<String, Long> counts = bestTeam.getPlayers().stream()
            .collect(Collectors.groupingBy(BestTeamPlayer::getPosition, Collectors.counting()));

        assertThat(counts.getOrDefault("GOALKEEPER", 0L)).isEqualTo(expectedGk);
        assertThat(counts.getOrDefault("DEFENDER", 0L)).isEqualTo(expectedDef);
        assertThat(counts.getOrDefault("MIDFIELD", 0L)).isEqualTo(expectedMid);
        assertThat(counts.getOrDefault("STRIKER", 0L)).isEqualTo(expectedStr);
    }

    @Test
    void getBestTeam_shouldReturnNullWhenNotCalculated() {
        seasonRepository.findById(season.getId()).ifPresent(s -> {
            s.setBestTeamJson(null);
            seasonRepository.save(s);
        });
        BestTeamResult result = bestTeamService.getBestTeam(season.getId());
        assertThat(result).isNull();
    }
}
