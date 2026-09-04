package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Player;
import de.ffl.domain.Team;
import de.ffl.dto.PlayerRankDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerRanksTest extends AbstractSeasonTestBase {

    @Autowired
    private PlayerService playerService;

    @Test
    void harryKane_round1_hasOpponentAndResultFromPlayerPerspective() {
        Player kane = findPlayerByName("Harry Kane");
        List<PlayerRankDto> ranks = playerService.findRanksByPlayerId(kane.getId());
        assertThat(ranks).isNotEmpty();

        PlayerRankDto round1 = ranks.stream()
                .filter(r -> r.getRoundNumber() == 1)
                .findFirst()
                .orElseThrow();

        Game game = gameRepository.findByRoundId(round1.getRoundId()).stream()
                .filter(g -> g.getPlayersHost().contains(kane) || g.getPlayersVisitor().contains(kane))
                .findFirst()
                .orElseThrow();

        boolean isHost = game.getPlayersHost().contains(kane);
        Team opponent = isHost ? game.getVisitor() : game.getHost();
        Integer ownGoals = isHost ? game.getGoalHost() : game.getGoalVisitor();
        Integer opponentGoals = isHost ? game.getGoalVisitor() : game.getGoalHost();

        assertThat(round1.getOpponent()).isEqualTo(opponent.getShortName());
        assertThat(round1.getGoalsOwn()).isEqualTo(ownGoals);
        assertThat(round1.getGoalsOpponent()).isEqualTo(opponentGoals);
        assertThat(round1.getGoalsOwn()).isNotNull();
        assertThat(round1.getGoalsOpponent()).isNotNull();
        assertThat(round1.getHomeAway()).isEqualTo(isHost ? "H" : "A");
    }

    @Test
    void harryKane_round1_opponentIsNotHisOwnTeam() {
        Player kane = findPlayerByName("Harry Kane");
        List<PlayerRankDto> ranks = playerService.findRanksByPlayerId(kane.getId());

        PlayerRankDto round1 = ranks.stream()
                .filter(r -> r.getRoundNumber() == 1)
                .findFirst()
                .orElseThrow();

        Game game = gameRepository.findByRoundId(round1.getRoundId()).stream()
                .filter(g -> g.getPlayersHost().contains(kane) || g.getPlayersVisitor().contains(kane))
                .findFirst()
                .orElseThrow();

        boolean isHost = game.getPlayersHost().contains(kane);
        Team ownTeam = isHost ? game.getHost() : game.getVisitor();

        assertThat(round1.getOpponent()).isNotBlank();
        assertThat(round1.getOpponent()).isNotEqualTo(ownTeam.getShortName());
    }

    private Player findPlayerByName(String name) {
        return playerMap.values().stream()
                .filter(p -> p.getNameKicker().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + name));
    }
}
