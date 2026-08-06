package de.ffl.migration;

import java.util.List;
import java.util.Map;

public record SetupPreviewDto(
        int teamCount,
        int playersTotal,
        Map<String, Integer> playersPerPosition,
        List<TeamBreakdown> teamBreakdown
) {
    public record TeamBreakdown(
            String name,
            int players,
            boolean hasGoalkeeper,
            boolean hasDefender,
            boolean hasMidfield,
            boolean hasStriker
    ) {
    }
}