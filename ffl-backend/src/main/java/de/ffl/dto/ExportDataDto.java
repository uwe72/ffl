package de.ffl.dto;

import de.ffl.domain.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
public class ExportDataDto {
    private String exportDate;
    private String version;
    private List<User> users = new ArrayList<>();
    private List<Team> teams = new ArrayList<>();
    private List<Season> seasons = new ArrayList<>();
    private List<Player> players = new ArrayList<>();
    private List<Manager> managers = new ArrayList<>();
    private List<Round> rounds = new ArrayList<>();
    private List<Game> games = new ArrayList<>();
    private List<ManagerGroup> managerGroups = new ArrayList<>();
    private List<ManagerPlayerRelation> managerPlayers = new ArrayList<>();
    private List<ManagerGroupMemberRelation> managerGroupMembers = new ArrayList<>();
    private List<SeasonTeamRelation> seasonTeams = new ArrayList<>();

    @Data
    public static class ManagerPlayerRelation {
        private Long managerId;
        private Long playerId;
    }

    @Data
    public static class ManagerGroupMemberRelation {
        private Long managerGroupId;
        private Long managerId;
    }

    @Data
    public static class SeasonTeamRelation {
        private Long seasonId;
        private Long teamId;
    }
}
