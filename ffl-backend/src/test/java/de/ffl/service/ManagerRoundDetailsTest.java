package de.ffl.service;

import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.dto.RoundDetailDto;
import de.ffl.repository.PlayerRankRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ManagerRoundDetailsTest extends AbstractSeasonTestBase {

    @Autowired
    private ManagerRoundService managerRoundService;
    @Autowired
    private PlayerRankRepository playerRankRepository;

    private Set<Long> exchangedOldPlayerIds() {
        return Set.of(
                findPlayerByName("Filippo Man\u00e9").getId(),
                findPlayerByName("Robin Hack").getId(),
                findPlayerByName("Leonardo Scienza").getId()
        );
    }

    private Set<Long> exchangedNewPlayerIds() {
        return Set.of(
                findPlayerByName("Kevin Diks").getId(),
                findPlayerByName("Said El Mala").getId(),
                findPlayerByName("Jakub Kaminski").getId()
        );
    }

    private Player findPlayerByName(String name) {
        return playerMap.values().stream()
                .filter(p -> p.getNameKicker().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + name));
    }

    @Test
    void roundDetailsPointsSumMatchesManagerRankForEveryRound() {
        List<RoundDetailDto> details = managerRoundService.getRoundDetailsForManager(managerUwe72.getId());
        assertThat(details).isNotEmpty();

        for (RoundDetailDto dto : details) {
            int sum = dto.getPlayerPoints().stream()
                    .mapToInt(RoundDetailDto.PlayerPointDto::getPoints)
                    .sum();
            assertThat(sum)
                    .as("Spieltag %d", dto.getRoundNumber())
                    .isEqualTo(dto.getPointsRound());
        }
    }

    @Test
    void beforeTransferRound_exchangedOldPlayersAppearInRoundDetails() {
        Set<Long> oldIds = exchangedOldPlayerIds();

        PlayerRank scoredRank = oldIds.stream()
                .flatMap(id -> playerRankRepository.findByPlayerIdIn(List.of(id)).stream())
                .filter(rank -> rank.getRound().getNumber() < TRANSFER_ROUND)
                .filter(rank -> rank.getPointsRound() != null && rank.getPointsRound() > 0)
                .findFirst()
                .orElseThrow();

        List<RoundDetailDto> details = managerRoundService.getRoundDetailsForManager(managerUwe72.getId());

        RoundDetailDto roundDto = details.stream()
                .filter(dto -> dto.getRoundNumber().equals(scoredRank.getRound().getNumber()))
                .findFirst()
                .orElseThrow();

        assertThat(roundDto.getPlayerPoints())
                .extracting(RoundDetailDto.PlayerPointDto::getPlayerId)
                .contains(scoredRank.getPlayer().getId());
    }

    @Test
    void afterTransferRound_exchangedOldPlayersDoNotAppearInRoundDetails() {
        Set<Long> oldIds = exchangedOldPlayerIds();

        List<RoundDetailDto> details = managerRoundService.getRoundDetailsForManager(managerUwe72.getId());

        for (RoundDetailDto dto : details) {
            if (dto.getRoundNumber() >= TRANSFER_ROUND) {
                assertThat(dto.getPlayerPoints())
                        .as("Spieltag %d", dto.getRoundNumber())
                        .extracting(RoundDetailDto.PlayerPointDto::getPlayerId)
                        .doesNotContainAnyElementsOf(oldIds);
            }
        }
    }

    @Test
    void afterTransferRound_exchangedNewPlayersAppearInRoundDetails() {
        Set<Long> newIds = exchangedNewPlayerIds();

        List<RoundDetailDto> details = managerRoundService.getRoundDetailsForManager(managerUwe72.getId());

        List<Integer> roundsWithNewPlayer = details.stream()
                .filter(dto -> dto.getRoundNumber() >= TRANSFER_ROUND)
                .filter(dto -> dto.getPlayerPoints().stream()
                        .anyMatch(pp -> newIds.contains(pp.getPlayerId())))
                .map(RoundDetailDto::getRoundNumber)
                .toList();

        assertThat(roundsWithNewPlayer).isNotEmpty();
    }
}
