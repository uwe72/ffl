package de.ffl.dto;

public class PositionStatsDto {
    private int goalkeeper;
    private int defender;
    private int midfield;
    private int striker;

    public int getGoalkeeper() { return goalkeeper; }
    public void setGoalkeeper(int goalkeeper) { this.goalkeeper = goalkeeper; }
    public int getDefender() { return defender; }
    public void setDefender(int defender) { this.defender = defender; }
    public int getMidfield() { return midfield; }
    public void setMidfield(int midfield) { this.midfield = midfield; }
    public int getStriker() { return striker; }
    public void setStriker(int striker) { this.striker = striker; }
}
