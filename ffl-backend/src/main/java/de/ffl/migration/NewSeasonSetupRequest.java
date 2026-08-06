package de.ffl.migration;

public record NewSeasonSetupRequest(
        String csvUrl,
        String seasonName
) {
}