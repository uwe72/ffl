package de.ffl.dto;

import jakarta.validation.constraints.NotNull;

public class SetStandardRequest {

    @NotNull
    private Long seasonId;

    private Long friendManagerId;

    public Long getSeasonId() { return seasonId; }
    public void setSeasonId(Long seasonId) { this.seasonId = seasonId; }
    public Long getFriendManagerId() { return friendManagerId; }
    public void setFriendManagerId(Long friendManagerId) { this.friendManagerId = friendManagerId; }
}
