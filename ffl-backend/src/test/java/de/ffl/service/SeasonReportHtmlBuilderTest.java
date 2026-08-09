package de.ffl.service;

import de.ffl.domain.*;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class SeasonReportHtmlBuilderTest {

    private final SeasonReportHtmlBuilder builder = new SeasonReportHtmlBuilder();

    @Test
    void buildReportHtml_chapter6_showsManagerWithLogin() {
        User user = User.builder()
            .login("maxi")
            .password("x")
            .email("max@example.com")
            .firstName("Max")
            .lastName("Mustermann")
            .role(UserRole.NORMAL)
            .build();

        Season season = Season.builder()
            .name("2025/26")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .build();

        Manager manager = Manager.builder()
            .id(1L)
            .user(user)
            .season(season)
            .budget(30_000_000)
            .build();

        ManagerGroup group = ManagerGroup.builder()
            .id(10L)
            .name("Gruppe A")
            .description("Testgruppe")
            .season(season)
            .managers(new HashSet<>(Set.of(manager)))
            .build();

        ManagerRank rank = ManagerRank.builder()
            .id(100L)
            .manager(manager)
            .positionTotal(1)
            .positionRound(1)
            .pointsTotal(120)
            .pointsRound(10)
            .build();

        Map<Long, List<ManagerRank>> groupRankings = Map.of(group.getId(), List.of(rank));

        String html = builder.buildReportHtml(
            season,
            List.of(rank),
            Collections.emptyList(),
            Collections.emptyList(),
            null,
            List.of(group),
            groupRankings,
            List.of(manager),
            Collections.emptyList(),
            List.of(user.getEmail())
        );

        assertThat(html).contains("Max Mustermann (maxi)");
    }

    @Test
    void buildReportHtml_chapter7_omitsBudget() {
        User user = User.builder()
            .login("maxi")
            .password("x")
            .email("max@example.com")
            .firstName("Max")
            .lastName("Mustermann")
            .role(UserRole.NORMAL)
            .build();

        Season season = Season.builder()
            .name("2025/26")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .build();

        Manager manager = Manager.builder()
            .id(1L)
            .user(user)
            .season(season)
            .budget(0)
            .build();

        String html = builder.buildReportHtml(
            season,
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            null,
            Collections.emptyList(),
            Collections.emptyMap(),
            List.of(manager),
            Collections.emptyList(),
            List.of(user.getEmail())
        );

        assertThat(html).doesNotContain("Budget:");
        assertThat(html).contains("max@example.com");
    }
}
