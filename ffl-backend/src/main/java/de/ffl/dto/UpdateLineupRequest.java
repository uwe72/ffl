package de.ffl.dto;

import jakarta.validation.constraints.NotNull;

public class UpdateLineupRequest {
    @NotNull
    private Long playerGoalkeeperId;

    @NotNull
    private Long playerDefender1Id;

    @NotNull
    private Long playerDefender2Id;

    @NotNull
    private Long playerDefender3Id;

    @NotNull
    private Long playerMidfield1Id;

    @NotNull
    private Long playerMidfield2Id;

    @NotNull
    private Long playerMidfield3Id;

    @NotNull
    private Long playerStriker1Id;

    @NotNull
    private Long playerStriker2Id;

    @NotNull
    private Long playerStriker3Id;

    @NotNull
    private Long playerFreeChoiceId;

    public Long getPlayerGoalkeeperId() { return playerGoalkeeperId; }
    public void setPlayerGoalkeeperId(Long playerGoalkeeperId) { this.playerGoalkeeperId = playerGoalkeeperId; }
    public Long getPlayerDefender1Id() { return playerDefender1Id; }
    public void setPlayerDefender1Id(Long playerDefender1Id) { this.playerDefender1Id = playerDefender1Id; }
    public Long getPlayerDefender2Id() { return playerDefender2Id; }
    public void setPlayerDefender2Id(Long playerDefender2Id) { this.playerDefender2Id = playerDefender2Id; }
    public Long getPlayerDefender3Id() { return playerDefender3Id; }
    public void setPlayerDefender3Id(Long playerDefender3Id) { this.playerDefender3Id = playerDefender3Id; }
    public Long getPlayerMidfield1Id() { return playerMidfield1Id; }
    public void setPlayerMidfield1Id(Long playerMidfield1Id) { this.playerMidfield1Id = playerMidfield1Id; }
    public Long getPlayerMidfield2Id() { return playerMidfield2Id; }
    public void setPlayerMidfield2Id(Long playerMidfield2Id) { this.playerMidfield2Id = playerMidfield2Id; }
    public Long getPlayerMidfield3Id() { return playerMidfield3Id; }
    public void setPlayerMidfield3Id(Long playerMidfield3Id) { this.playerMidfield3Id = playerMidfield3Id; }
    public Long getPlayerStriker1Id() { return playerStriker1Id; }
    public void setPlayerStriker1Id(Long playerStriker1Id) { this.playerStriker1Id = playerStriker1Id; }
    public Long getPlayerStriker2Id() { return playerStriker2Id; }
    public void setPlayerStriker2Id(Long playerStriker2Id) { this.playerStriker2Id = playerStriker2Id; }
    public Long getPlayerStriker3Id() { return playerStriker3Id; }
    public void setPlayerStriker3Id(Long playerStriker3Id) { this.playerStriker3Id = playerStriker3Id; }
    public Long getPlayerFreeChoiceId() { return playerFreeChoiceId; }
    public void setPlayerFreeChoiceId(Long playerFreeChoiceId) { this.playerFreeChoiceId = playerFreeChoiceId; }
}
