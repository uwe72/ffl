package de.ffl.service;

import de.ffl.dto.PlayerDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerPublicDtoTest extends AbstractSeasonTestBase {

    @Autowired
    private PlayerService playerService;

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Test
    void findPublicBySeasonId_returnsStammdatenOnly_withoutManagerOrStatsInfo() {
        List<PlayerDto> publicPlayers = playerService.findPublicBySeasonId(season.getId());

        assertThat(publicPlayers).isNotEmpty();
        for (PlayerDto dto : publicPlayers) {
            assertThat(dto.getNameKicker()).isNotBlank();
            assertThat(dto.getPosition()).isNotNull();
            assertThat(dto.getManagerCount()).isNull();
            assertThat(dto.getManagers()).isNull();
            assertThat(dto.getPoints()).isNull();
            assertThat(dto.getPositionTotal()).isNull();
            assertThat(dto.getPointsLastRound()).isNull();
            assertThat(dto.getPositionLastRound()).isNull();
            assertThat(dto.getPositionChange()).isNull();
            assertThat(dto.getSeason()).isNull();
        }
    }

    @Test
    void findBySeasonId_stillSetsManagerCount() {
        List<PlayerDto> players = playerService.findBySeasonId(season.getId());

        assertThat(players).isNotEmpty();
        assertThat(players).allSatisfy(dto -> assertThat(dto.getManagerCount()).isNotNull());
    }
}
