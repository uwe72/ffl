package de.ffl.service;

import de.ffl.domain.Team;
import org.junit.jupiter.api.Test;

import java.util.List;

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
}
