package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.Team;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SeasonTransparencyMailServiceTest {

    @Test
    void buildManagerSquadDto_groupsPlayersByPosition() {
        User user = User.builder()
            .login("maxi")
            .password("x")
            .email("max@example.com")
            .firstName("Max")
            .lastName("Mustermann")
            .role(UserRole.NORMAL)
            .build();

        Season season = Season.builder().name("2025/26").build();

        Player keeper = player(1L, "Manuel", "Neuer", Position.GOALKEEPER, 5_000_000);
        Player striker = player(2L, "Harry", "Kane", Position.STRIKER, 12_000_000);

        Manager manager = Manager.builder()
            .id(1L)
            .user(user)
            .season(season)
            .playerGoalkeeper(keeper)
            .playerStriker1(striker)
            .build();

        SeasonTransparencyMailService.ManagerSquadDto dto =
            SeasonTransparencyMailService.buildManagerSquadDto(manager, 1);

        assertThat(dto.number()).isEqualTo(1);
        assertThat(dto.displayName()).isEqualTo("Max Mustermann");
        assertThat(dto.login()).isEqualTo("maxi");
        assertThat(dto.positionGroups()).hasSize(2);
        assertThat(dto.positionGroups().get(0).label()).isEqualTo("Torwart");
        assertThat(dto.positionGroups().get(1).label()).isEqualTo("Sturm");
    }

    @Test
    void buildAllPlayersTable_filtersUnusedAndSortsByManagerCountDesc() {
        Player p1 = player(1L, "Harry", "Kane", Position.STRIKER, 12_000_000);
        Player p2 = player(2L, "Manuel", "Neuer", Position.GOALKEEPER, 5_000_000);
        Player p3 = player(3L, "Nicht", "Gewaehlt", Position.MIDFIELD, 3_000_000);

        Map<Long, Long> counts = new HashMap<>();
        counts.put(1L, 7L);
        counts.put(2L, 42L);

        List<SeasonTransparencyMailService.AllPlayerRowDto> rows =
            SeasonTransparencyMailService.buildAllPlayersTable(List.of(p1, p2, p3), counts);

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).name()).isEqualTo("Manuel Neuer");
        assertThat(rows.get(0).managerCount()).isEqualTo(42);
        assertThat(rows.get(1).managerCount()).isEqualTo(7);
        assertThat(rows.get(0).positionLabel()).isEqualTo("TW");
    }

    @Test
    void buildManagerDisplayName_fallsBackToNameWhenUserNull() {
        Manager manager = Manager.builder().build();
        assertThat(SeasonTransparencyMailService.buildManagerDisplayName(manager)).isEqualTo("Unbekannt");
    }

    private Player player(Long id, String firstName, String lastName, Position position, int prize) {
        return Player.builder()
            .id(id)
            .nameKicker(lastName)
            .firstName(firstName)
            .lastName(lastName)
            .position(position)
            .prize(prize)
            .teams(List.of(Team.builder().id(1L).name("FCB").shortName("FCB").build()))
            .build();
    }
}
