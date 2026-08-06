package de.ffl.migration;

public record KickerPlayerCsvRow(
        String kickerId,
        String firstName,
        String lastName,
        String displayNameShort,
        String displayNameFull,
        String teamName,
        String rawPosition,
        Integer marketValue,
        Integer points,
        Double gradeAvg
) {
}