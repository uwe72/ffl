package de.ffl.dto;

import java.util.List;

public class RoundDetailDto {
    private Long roundId;
    private Integer roundNumber;
    private Integer pointsRound;
    private Integer pointsTotal;
    private Integer positionRound;
    private Integer positionTotal;
    private List<PlayerPointDto> playerPoints;

    public Long getRoundId() { return roundId; }
    public void setRoundId(Long roundId) { this.roundId = roundId; }
    public Integer getRoundNumber() { return roundNumber; }
    public void setRoundNumber(Integer roundNumber) { this.roundNumber = roundNumber; }
    public Integer getPointsRound() { return pointsRound; }
    public void setPointsRound(Integer pointsRound) { this.pointsRound = pointsRound; }
    public Integer getPointsTotal() { return pointsTotal; }
    public void setPointsTotal(Integer pointsTotal) { this.pointsTotal = pointsTotal; }
    public Integer getPositionRound() { return positionRound; }
    public void setPositionRound(Integer positionRound) { this.positionRound = positionRound; }
    public Integer getPositionTotal() { return positionTotal; }
    public void setPositionTotal(Integer positionTotal) { this.positionTotal = positionTotal; }
    public List<PlayerPointDto> getPlayerPoints() { return playerPoints; }
    public void setPlayerPoints(List<PlayerPointDto> playerPoints) { this.playerPoints = playerPoints; }

    public static class PlayerPointDto {
        private Long playerId;
        private String playerName;
        private Integer points;
        private List<RulePointDto> rules;
        private String position;
        private Integer prize;
        private String teamName;
        private String teamLogoUrl;
        private Integer positionTotal;
        private Integer positionChange;
        private Integer pointsLastRound;
        private Integer pointsTotal;
        private Integer managerCount;
        private String pictureUrl;

        public Long getPlayerId() { return playerId; }
        public void setPlayerId(Long playerId) { this.playerId = playerId; }
        public String getPlayerName() { return playerName; }
        public void setPlayerName(String playerName) { this.playerName = playerName; }
        public Integer getPoints() { return points; }
        public void setPoints(Integer points) { this.points = points; }
        public List<RulePointDto> getRules() { return rules; }
        public void setRules(List<RulePointDto> rules) { this.rules = rules; }
        public String getPosition() { return position; }
        public void setPosition(String position) { this.position = position; }
        public Integer getPrize() { return prize; }
        public void setPrize(Integer prize) { this.prize = prize; }
        public String getTeamName() { return teamName; }
        public void setTeamName(String teamName) { this.teamName = teamName; }
        public String getTeamLogoUrl() { return teamLogoUrl; }
        public void setTeamLogoUrl(String teamLogoUrl) { this.teamLogoUrl = teamLogoUrl; }
        public Integer getPositionTotal() { return positionTotal; }
        public void setPositionTotal(Integer positionTotal) { this.positionTotal = positionTotal; }
        public Integer getPositionChange() { return positionChange; }
        public void setPositionChange(Integer positionChange) { this.positionChange = positionChange; }
        public Integer getPointsLastRound() { return pointsLastRound; }
        public void setPointsLastRound(Integer pointsLastRound) { this.pointsLastRound = pointsLastRound; }
        public Integer getPointsTotal() { return pointsTotal; }
        public void setPointsTotal(Integer pointsTotal) { this.pointsTotal = pointsTotal; }
        public Integer getManagerCount() { return managerCount; }
        public void setManagerCount(Integer managerCount) { this.managerCount = managerCount; }
        public String getPictureUrl() { return pictureUrl; }
        public void setPictureUrl(String pictureUrl) { this.pictureUrl = pictureUrl; }
    }

    public static class RulePointDto {
        private String rule;
        private String ruleLabel;
        private Integer count;
        private Integer points;

        public String getRule() { return rule; }
        public void setRule(String rule) { this.rule = rule; }
        public String getRuleLabel() { return ruleLabel; }
        public void setRuleLabel(String ruleLabel) { this.ruleLabel = ruleLabel; }
        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
        public Integer getPoints() { return points; }
        public void setPoints(Integer points) { this.points = points; }
    }
}
