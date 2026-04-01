package de.ffl.domain;

public enum Rule {
    GOAL_STRIKER(3),
    GOAL_MIDFIELDER(5),
    GOAL_DEFENDER(7),
    TO_NULL_GOALKEEPER(5),
    TO_NULL_DEFENDER(2),
    GOAL_GOALKEEPER(10),
    GOAL_GOALKEEPER_BY_PENALTY(3);

    private final int points;

    Rule(int points) {
        this.points = points;
    }

    public int getPoints() {
        return points;
    }
}