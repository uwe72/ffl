package de.ffl.dto;

import java.util.List;

public class ManagerRoundStatsDto {
    private Long managerId;
    private String managerName;
    private String shortName;
    private List<RoundPointDto> roundData;

    public Long getManagerId() { return managerId; }
    public void setManagerId(Long managerId) { this.managerId = managerId; }
    public String getManagerName() { return managerName; }
    public void setManagerName(String managerName) { this.managerName = managerName; }
    public String getShortName() { return shortName; }
    public void setShortName(String shortName) { this.shortName = shortName; }
    public List<RoundPointDto> getRoundData() { return roundData; }
    public void setRoundData(List<RoundPointDto> roundData) { this.roundData = roundData; }

    public static class RoundPointDto {
        private int round;
        private int pointsCumulative;

        public int getRound() { return round; }
        public void setRound(int round) { this.round = round; }
        public int getPointsCumulative() { return pointsCumulative; }
        public void setPointsCumulative(int pointsCumulative) { this.pointsCumulative = pointsCumulative; }
    }
}
