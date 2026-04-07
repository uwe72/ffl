package de.ffl.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ImportResult {
    private boolean success;
    private boolean dryRun;
    private String message;
    private int usersImported = 0;
    private int teamsImported = 0;
    private int seasonsImported = 0;
    private int playersImported = 0;
    private int managersImported = 0;
    private int roundsImported = 0;
    private int gamesImported = 0;
    private int managerGroupsImported = 0;
    private int managerPlayersImported = 0;
    private int managerGroupMembersImported = 0;
    private int seasonTeamsImported = 0;
    private List<String> errors = new ArrayList<>();
}
