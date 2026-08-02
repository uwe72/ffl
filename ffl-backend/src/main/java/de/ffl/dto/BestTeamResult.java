package de.ffl.dto;

import java.util.List;

public class BestTeamResult {
    private List<BestTeamPlayer> players;
    private int totalPoints;
    private long totalCost;
    private String formation;
    private long budget;

    public BestTeamResult() {}

    public BestTeamResult(List<BestTeamPlayer> players, int totalPoints, long totalCost, String formation, long budget) {
        this.players = players;
        this.totalPoints = totalPoints;
        this.totalCost = totalCost;
        this.formation = formation;
        this.budget = budget;
    }

    public List<BestTeamPlayer> getPlayers() { return players; }
    public void setPlayers(List<BestTeamPlayer> players) { this.players = players; }
    public int getTotalPoints() { return totalPoints; }
    public void setTotalPoints(int totalPoints) { this.totalPoints = totalPoints; }
    public long getTotalCost() { return totalCost; }
    public void setTotalCost(long totalCost) { this.totalCost = totalCost; }
    public String getFormation() { return formation; }
    public void setFormation(String formation) { this.formation = formation; }
    public long getBudget() { return budget; }
    public void setBudget(long budget) { this.budget = budget; }

    public static class BestTeamPlayer {
        private Long id;
        private String name;
        private String position;
        private int points;
        private int prize;
        private String teamName;
        private String teamLogoUrl;
        private String pictureUrl;
        private boolean freeChoice;

        public BestTeamPlayer() {}

        public BestTeamPlayer(Long id, String name, String position, int points, int prize,
                              String teamName, String teamLogoUrl, String pictureUrl, boolean freeChoice) {
            this.id = id;
            this.name = name;
            this.position = position;
            this.points = points;
            this.prize = prize;
            this.teamName = teamName;
            this.teamLogoUrl = teamLogoUrl;
            this.pictureUrl = pictureUrl;
            this.freeChoice = freeChoice;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPosition() { return position; }
        public void setPosition(String position) { this.position = position; }
        public int getPoints() { return points; }
        public void setPoints(int points) { this.points = points; }
        public int getPrize() { return prize; }
        public void setPrize(int prize) { this.prize = prize; }
        public String getTeamName() { return teamName; }
        public void setTeamName(String teamName) { this.teamName = teamName; }
        public String getTeamLogoUrl() { return teamLogoUrl; }
        public void setTeamLogoUrl(String teamLogoUrl) { this.teamLogoUrl = teamLogoUrl; }
        public String getPictureUrl() { return pictureUrl; }
        public void setPictureUrl(String pictureUrl) { this.pictureUrl = pictureUrl; }
        public boolean isFreeChoice() { return freeChoice; }
        public void setFreeChoice(boolean freeChoice) { this.freeChoice = freeChoice; }
    }
}
