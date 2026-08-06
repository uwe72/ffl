package de.ffl.migration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KickerClientDatabase(
        List<KickerTeam> teams,
        List<KickerPlayer> players,
        List<KickerMatch> matches,
        List<KickerRound> rounds
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KickerTeam(
            String id,
            String name,
            String shortName
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KickerPlayer(
            String id,
            String teamId,
            String firstName,
            String lastName,
            String displayName,
            String displayLongName,
            Integer marketValue,
            String position,
            String seasonImage,
            String photo,
            String photoFallback,
            String fallbackImage,
            Boolean active
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KickerMatch(
            String id,
            String roundId,
            String homeTeamId,
            String guestTeamId,
            Long date
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KickerRound(
            String id,
            String name
    ) {}
}
