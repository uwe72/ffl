package de.ffl.dto;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class PlayerDto {
    private Long id;
    private String nameKicker;
    private String firstName;
    private String lastName;
    private Position position;
    private Integer prize;
    private String pictureUrl;
    private List<TeamInfo> teams;
    private Integer managerCount;
    private List<ManagerInfo> managers;
    private Integer points;
    private Integer positionTotal;
    private Integer pointsLastRound;
    private Integer positionChange;

    public static PlayerDto fromEntity(Player player) {
        PlayerDto dto = new PlayerDto();
        dto.setId(player.getId());
        dto.setNameKicker(player.getNameKicker());
        dto.setFirstName(player.getFirstName());
        dto.setLastName(player.getLastName());
        dto.setPosition(player.getPosition());
        dto.setPrize(player.getPrize());
        dto.setPictureUrl(player.getPictureUrl());
        if (player.getTeams() != null) {
            dto.setTeams(player.getTeams().stream()
                .map(t -> new TeamInfo(t.getId(), t.getName(), t.getLogoXxlUrl(), t.getLogoSUrl()))
                .collect(Collectors.toList()));
        }
        return dto;
    }

    public static PlayerDto fromEntityWithManagers(Player player, List<Manager> managers) {
        PlayerDto dto = fromEntity(player);
        dto.setManagerCount(managers.size());
        dto.setManagers(managers.stream()
            .map(m -> {
                ManagerInfo info = new ManagerInfo();
                info.setId(m.getId());
                info.setName(m.getName());
                info.setShortName(m.getShortName());
                info.setHinrunde(hasPlayerInHinrunde(m, player));
                info.setRueckrunde(hasPlayerInRueckrunde(m, player));
                return info;
            })
            .collect(Collectors.toList()));
        return dto;
    }

    private static boolean hasPlayerInHinrunde(Manager manager, Player player) {
        Long playerId = player.getId();
        return equalsId(manager.getPlayerGoalkeeper(), playerId) ||
               equalsId(manager.getPlayerDefender1(), playerId) ||
               equalsId(manager.getPlayerDefender2(), playerId) ||
               equalsId(manager.getPlayerDefender3(), playerId) ||
               equalsId(manager.getPlayerMidfield1(), playerId) ||
               equalsId(manager.getPlayerMidfield2(), playerId) ||
               equalsId(manager.getPlayerMidfield3(), playerId) ||
               equalsId(manager.getPlayerStriker1(), playerId) ||
               equalsId(manager.getPlayerStriker2(), playerId) ||
               equalsId(manager.getPlayerStriker3(), playerId) ||
               equalsId(manager.getPlayerFreeChoice(), playerId);
    }

    private static boolean hasPlayerInRueckrunde(Manager manager, Player player) {
        Long playerId = player.getId();
        boolean inHinrunde = hasPlayerInHinrunde(manager, player);
        boolean isExchangedOut = equalsId(manager.getPlayerExchangedOld1(), playerId) ||
                                  equalsId(manager.getPlayerExchangedOld2(), playerId) ||
                                  equalsId(manager.getPlayerExchangedOld3(), playerId);
        boolean isExchangedIn = equalsId(manager.getPlayerExchangedNew1(), playerId) ||
                                equalsId(manager.getPlayerExchangedNew2(), playerId) ||
                                equalsId(manager.getPlayerExchangedNew3(), playerId);
        
        if (isExchangedIn) return true;
        if (isExchangedOut) return false;
        return inHinrunde;
    }

    private static boolean equalsId(Player p, Long id) {
        return p != null && p.getId().equals(id);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNameKicker() { return nameKicker; }
    public void setNameKicker(String nameKicker) { this.nameKicker = nameKicker; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public Position getPosition() { return position; }
    public void setPosition(Position position) { this.position = position; }
    public Integer getPrize() { return prize; }
    public void setPrize(Integer prize) { this.prize = prize; }
    public String getPictureUrl() { return pictureUrl; }
    public void setPictureUrl(String pictureUrl) { this.pictureUrl = pictureUrl; }
    public List<TeamInfo> getTeams() { return teams; }
    public void setTeams(List<TeamInfo> teams) { this.teams = teams; }
    public Integer getManagerCount() { return managerCount; }
    public void setManagerCount(Integer managerCount) { this.managerCount = managerCount; }
    public List<ManagerInfo> getManagers() { return managers; }
    public void setManagers(List<ManagerInfo> managers) { this.managers = managers; }
    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }
    public Integer getPositionTotal() { return positionTotal; }
    public void setPositionTotal(Integer positionTotal) { this.positionTotal = positionTotal; }
    public Integer getPointsLastRound() { return pointsLastRound; }
    public void setPointsLastRound(Integer pointsLastRound) { this.pointsLastRound = pointsLastRound; }
    public Integer getPositionChange() { return positionChange; }
    public void setPositionChange(Integer positionChange) { this.positionChange = positionChange; }

    public static class TeamInfo {
        private Long id;
        private String name;
        private String logoUrl;
        private String logoSUrl;

        public TeamInfo(Long id, String name, String logoUrl, String logoSUrl) {
            this.id = id;
            this.name = name;
            this.logoUrl = logoUrl;
            this.logoSUrl = logoSUrl;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getLogoUrl() { return logoUrl; }
        public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
        public String getLogoSUrl() { return logoSUrl; }
        public void setLogoSUrl(String logoSUrl) { this.logoSUrl = logoSUrl; }
    }

    public static class ManagerInfo {
        private Long id;
        private String name;
        private String shortName;
        private String firstName;
        private String lastName;
        private Integer teamValue;
        private String paymentState;
        private Integer positionTotal;
        private Integer pointsTotal;
        private Integer pointsLastRound;
        private boolean hinrunde;
        private boolean rueckrunde;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getShortName() { return shortName; }
        public void setShortName(String shortName) { this.shortName = shortName; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public Integer getTeamValue() { return teamValue; }
        public void setTeamValue(Integer teamValue) { this.teamValue = teamValue; }
        public String getPaymentState() { return paymentState; }
        public void setPaymentState(String paymentState) { this.paymentState = paymentState; }
        public Integer getPositionTotal() { return positionTotal; }
        public void setPositionTotal(Integer positionTotal) { this.positionTotal = positionTotal; }
        public Integer getPointsTotal() { return pointsTotal; }
        public void setPointsTotal(Integer pointsTotal) { this.pointsTotal = pointsTotal; }
        public Integer getPointsLastRound() { return pointsLastRound; }
        public void setPointsLastRound(Integer pointsLastRound) { this.pointsLastRound = pointsLastRound; }
        public boolean isHinrunde() { return hinrunde; }
        public void setHinrunde(boolean hinrunde) { this.hinrunde = hinrunde; }
        public boolean isRueckrunde() { return rueckrunde; }
        public void setRueckrunde(boolean rueckrunde) { this.rueckrunde = rueckrunde; }
    }
}