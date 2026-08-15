package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.Team;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
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
    void buildAllPlayersTable_filtersUnusedAndSortsByNameAscending() {
        Player p1 = player(1L, "Harry", "Kane", Position.STRIKER, 12_000_000);
        Player p2 = player(2L, "Manuel", "Neuer", Position.GOALKEEPER, 5_000_000);
        Player p3 = player(3L, "Nicht", "Gewaehlt", Position.MIDFIELD, 3_000_000);

        Map<Long, Long> counts = new HashMap<>();
        counts.put(1L, 7L);
        counts.put(2L, 42L);

        List<SeasonTransparencyMailService.AllPlayerRowDto> rows =
            SeasonTransparencyMailService.buildAllPlayersTable(List.of(p1, p2, p3), counts);

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).name()).isEqualTo("Harry Kane");
        assertThat(rows.get(1).name()).isEqualTo("Manuel Neuer");
        assertThat(rows.get(0).positionLabel()).isEqualTo("ST");
        assertThat(rows.get(1).positionLabel()).isEqualTo("TW");
    }

    @Test
    void sortManagersByName_ordersByFirstNameThenLastName() {
        User u1 = User.builder().login("a").password("x").email("a@x.de").firstName("Berta").lastName("Adams").role(UserRole.NORMAL).build();
        User u2 = User.builder().login("b").password("x").email("b@x.de").firstName("Anna").lastName("Müller").role(UserRole.NORMAL).build();
        User u3 = User.builder().login("c").password("x").email("c@x.de").firstName("Anna").lastName("Bauer").role(UserRole.NORMAL).build();
        User u4 = User.builder().login("d").password("x").email("d@x.de").firstName(null).lastName("Ohne").role(UserRole.NORMAL).build();

        Season season = Season.builder().name("2025/26").build();
        Manager m1 = Manager.builder().id(1L).user(u1).season(season).build();
        Manager m2 = Manager.builder().id(2L).user(u2).season(season).build();
        Manager m3 = Manager.builder().id(3L).user(u3).season(season).build();
        Manager m4 = Manager.builder().id(4L).user(u4).season(season).build();

        List<Manager> managers = new ArrayList<>(List.of(m1, m2, m3, m4));
        SeasonTransparencyMailService.sortManagersByName(managers);

        assertThat(managers).extracting(Manager::getName)
            .containsExactly("Anna Bauer", "Anna Müller", "Berta Adams", "Ohne");
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
