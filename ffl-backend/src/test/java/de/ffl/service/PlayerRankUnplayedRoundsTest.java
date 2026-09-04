package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Round;
import de.ffl.domain.Season;
import de.ffl.dto.PlayerDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerRankUnplayedRoundsTest extends AbstractSeasonTestBase {

    @Autowired
    private PlayerService playerService;

    private void markRoundsUnplayedFrom(int fromRound) {
        for (int i = fromRound; i <= 34; i++) {
            Round round = roundMap.get(i);
            for (Game game : gameRepository.findByRoundId(round.getId())) {
                game.setFormation(null);
                game.setFormationExtern(null);
                gameRepository.save(game);
            }
        }
    }

    @Test
    void unplayedRounds_doNotProduceRanksAfterRecalculation() {
        markRoundsUnplayedFrom(2);
        seasonCalculationService.calculateSeason(season.getId());

        Round round1 = roundMap.get(1);
        assertThat(playerRankRepository.findByRoundId(round1.getId())).isNotEmpty();
        for (int i = 2; i <= 34; i++) {
            assertThat(playerRankRepository.findByRoundId(roundMap.get(i).getId())).isEmpty();
        }

        Season refreshed = seasonRepository.findById(season.getId()).orElseThrow();
        assertThat(refreshed.getCurrentMatchday()).isEqualTo(1);
    }

    @Test
    void staleRanksForUnplayedRounds_areIgnoredByPlayerDetail() {
        Round round1 = roundMap.get(1);
        Player player = playerMap.values().stream()
            .filter(p -> playerRankRepository.findByPlayerIdAndRoundId(p.getId(), round1.getId())
                .map(r -> r.getPositionRound() != null && r.getPositionRound() != 1)
                .orElse(false))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No player with non-first round-1 position found"));

        PlayerRank round1Rank = playerRankRepository.findByPlayerIdAndRoundId(player.getId(), round1.getId()).orElseThrow();
        int expectedPositionRound = round1Rank.getPositionRound();
        int expectedPositionTotal = round1Rank.getPositionTotal();
        int expectedPointsRound = round1Rank.getPointsRound();

        season.setCurrentMatchday(1);
        seasonRepository.save(season);

        Round round34 = roundMap.get(34);
        playerRankRepository.save(PlayerRank.builder()
            .player(player)
            .round(round34)
            .positionTotal(999)
            .positionRound(999)
            .pointsTotal(0)
            .pointsRound(0)
            .numberMatches(1)
            .played(false)
            .build());

        PlayerDto dto = playerService.findByIdWithManagers(player.getId());
        assertThat(dto.getPositionLastRound()).isEqualTo(expectedPositionRound);
        assertThat(dto.getPositionTotal()).isEqualTo(expectedPositionTotal);
        assertThat(dto.getPointsLastRound()).isEqualTo(expectedPointsRound);
    }
}
