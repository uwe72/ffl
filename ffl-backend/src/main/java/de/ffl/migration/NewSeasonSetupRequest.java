package de.ffl.migration;

public record NewSeasonSetupRequest(
        String sourceUrl,
        String seasonName
) {
}
