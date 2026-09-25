package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Team;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MatchdayMailRosterTableTest {

    @Test
    void formatMio_formatsOneDecimalWithComma() {
        assertThat(MatchdayMailTransactionService.formatMio(3_200_000)).isEqualTo("3,2");
        assertThat(MatchdayMailTransactionService.formatMio(29_800_000)).isEqualTo("29,8");
        assertThat(MatchdayMailTransactionService.formatMio(5_000_000)).isEqualTo("5,0");
    }

    @Test
    void teamShortName_usesLatestTeamShortName() {
        Team a = Team.builder().shortName("B04").build();
        Team b = Team.builder().shortName("BMG").build();
        assertThat(MatchdayMailTransactionService.teamShortName(List.of(a, b))).isEqualTo("BMG");
    }

    @Test
    void teamShortName_returnsEmptyWhenNoTeams() {
        assertThat(MatchdayMailTransactionService.teamShortName(null)).isEmpty();
        assertThat(MatchdayMailTransactionService.teamShortName(List.of())).isEmpty();
    }

    @Test
    void collectFullRoster_hinrunde_excludesWinterTransferNewPlayers() {
        Manager manager = managerWithWinterTransfer();

        List<MatchdayMailTransactionService.RosterEntry> roster =
            MatchdayMailTransactionService.collectFullRoster(manager, Map.of(), false);

        assertThat(roster).hasSize(11);
        assertThat(roster.stream().map(e -> e.player.getNameKicker()))
            .doesNotContain("Neuzugang");
    }

    @Test
    void collectFullRoster_rueckrunde_includesWinterTransferNewPlayers() {
        Manager manager = managerWithWinterTransfer();

        List<MatchdayMailTransactionService.RosterEntry> roster =
            MatchdayMailTransactionService.collectFullRoster(manager, Map.of(), true);

        assertThat(roster).hasSize(12);
        assertThat(roster.stream().map(e -> e.player.getNameKicker()))
            .contains("Neuzugang");

        MatchdayMailTransactionService.RosterEntry exchanged = roster.stream()
            .filter(e -> "AlterSpieler".equals(e.player.getNameKicker()))
            .findFirst().orElseThrow();
        assertThat(exchanged.activeHinrunde).isTrue();
        assertThat(exchanged.activeRueckrunde).isFalse();

        MatchdayMailTransactionService.RosterEntry newcomer = roster.stream()
            .filter(e -> "Neuzugang".equals(e.player.getNameKicker()))
            .findFirst().orElseThrow();
        assertThat(newcomer.activeHinrunde).isFalse();
        assertThat(newcomer.activeRueckrunde).isTrue();
    }

    private Manager managerWithWinterTransfer() {
        Player oldPlayer = Player.builder().id(1L).nameKicker("AlterSpieler").position(Position.DEFENDER).build();
        Player newPlayer = Player.builder().id(2L).nameKicker("Neuzugang").position(Position.MIDFIELD).build();
        return Manager.builder()
            .playerGoalkeeper(Player.builder().id(10L).nameKicker("TW").position(Position.GOALKEEPER).build())
            .playerDefender1(oldPlayer)
            .playerDefender2(Player.builder().id(12L).nameKicker("VT2").position(Position.DEFENDER).build())
            .playerDefender3(Player.builder().id(13L).nameKicker("VT3").position(Position.DEFENDER).build())
            .playerMidfield1(Player.builder().id(14L).nameKicker("MF1").position(Position.MIDFIELD).build())
            .playerMidfield2(Player.builder().id(15L).nameKicker("MF2").position(Position.MIDFIELD).build())
            .playerMidfield3(Player.builder().id(16L).nameKicker("MF3").position(Position.MIDFIELD).build())
            .playerStriker1(Player.builder().id(17L).nameKicker("ST1").position(Position.STRIKER).build())
            .playerStriker2(Player.builder().id(18L).nameKicker("ST2").position(Position.STRIKER).build())
            .playerStriker3(Player.builder().id(19L).nameKicker("ST3").position(Position.STRIKER).build())
            .playerFreeChoice(Player.builder().id(20L).nameKicker("FREI").position(Position.MIDFIELD).build())
            .playerExchangedOld1(oldPlayer)
            .playerExchangedNew1(newPlayer)
            .build();
    }
}
