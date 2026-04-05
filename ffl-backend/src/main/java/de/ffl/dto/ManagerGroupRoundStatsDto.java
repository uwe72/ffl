package de.ffl.dto;

import java.util.List;

public class ManagerGroupRoundStatsDto {
    private Long groupId;
    private String groupName;
    private List<ManagerRoundDataDto> managers;

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public List<ManagerRoundDataDto> getManagers() { return managers; }
    public void setManagers(List<ManagerRoundDataDto> managers) { this.managers = managers; }

    public static class ManagerRoundDataDto {
        private Long managerId;
        private String managerName;
        private String shortName;
        private String firstName;
        private String lastName;
        private String login;
        private boolean isCurrentUser;
        private List<RoundPointDto> roundData;

        public Long getManagerId() { return managerId; }
        public void setManagerId(Long managerId) { this.managerId = managerId; }
        public String getManagerName() { return managerName; }
        public void setManagerName(String managerName) { this.managerName = managerName; }
        public String getShortName() { return shortName; }
        public void setShortName(String shortName) { this.shortName = shortName; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public String getLogin() { return login; }
        public void setLogin(String login) { this.login = login; }
        public boolean getIsCurrentUser() { return isCurrentUser; }
        public void setIsCurrentUser(boolean currentUser) { isCurrentUser = currentUser; }
        public List<RoundPointDto> getRoundData() { return roundData; }
        public void setRoundData(List<RoundPointDto> roundData) { this.roundData = roundData; }
    }

    public static class RoundPointDto {
        private int round;
        private int pointsCumulative;

        public int getRound() { return round; }
        public void setRound(int round) { this.round = round; }
        public int getPointsCumulative() { return pointsCumulative; }
        public void setPointsCumulative(int pointsCumulative) { this.pointsCumulative = pointsCumulative; }
    }
}
