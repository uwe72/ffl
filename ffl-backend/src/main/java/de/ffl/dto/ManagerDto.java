package de.ffl.dto;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;

public class ManagerDto {
    private Long id;
    private String name;
    private String shortName;
    private String firstName;
    private String lastName;
    private String email;
    private Integer teamValue;
    private String paymentState;
    private String description;
    private Long seasonId;
    private String seasonName;
    private Integer pointsTotal;
    private Integer pointsLastRound;
    private Integer positionTotal;
    private Integer positionLastRound;
    private PlayerDto playerGoalkeeper;
    private PlayerDto playerDefender1;
    private PlayerDto playerDefender2;
    private PlayerDto playerDefender3;
    private PlayerDto playerMidfield1;
    private PlayerDto playerMidfield2;
    private PlayerDto playerMidfield3;
    private PlayerDto playerStriker1;
    private PlayerDto playerStriker2;
    private PlayerDto playerStriker3;
    private PlayerDto playerFreeChoice;
    private PlayerDto playerExchangedOld1;
    private PlayerDto playerExchangedOld2;
    private PlayerDto playerExchangedOld3;
    private PlayerDto playerExchangedNew1;
    private PlayerDto playerExchangedNew2;
    private PlayerDto playerExchangedNew3;
    private Integer currentMatchday;
    private Integer positionChange;

    public static ManagerDto fromEntity(Manager manager) {
        ManagerDto dto = new ManagerDto();
        dto.setId(manager.getId());
        dto.setName(manager.getName());
        dto.setShortName(manager.getShortName());
        
        if (manager.getUser() != null) {
            dto.setFirstName(manager.getUser().getFirstName());
            dto.setLastName(manager.getUser().getLastName());
            dto.setEmail(manager.getUser().getEmail());
        }
        
        dto.setPaymentState(manager.getPaymentState().name());
        dto.setDescription(manager.getDescription());
        
        if (manager.getSeason() != null) {
            dto.setSeasonId(manager.getSeason().getId());
            dto.setSeasonName(manager.getSeason().getName());
            dto.setCurrentMatchday(manager.getSeason().getCurrentMatchday());
        }
        
        int teamValue = calculateTeamValue(manager);
        dto.setTeamValue(teamValue);
        
        if (manager.getPlayerGoalkeeper() != null) {
            dto.setPlayerGoalkeeper(PlayerDto.fromEntity(manager.getPlayerGoalkeeper()));
        }
        if (manager.getPlayerDefender1() != null) {
            dto.setPlayerDefender1(PlayerDto.fromEntity(manager.getPlayerDefender1()));
        }
        if (manager.getPlayerDefender2() != null) {
            dto.setPlayerDefender2(PlayerDto.fromEntity(manager.getPlayerDefender2()));
        }
        if (manager.getPlayerDefender3() != null) {
            dto.setPlayerDefender3(PlayerDto.fromEntity(manager.getPlayerDefender3()));
        }
        if (manager.getPlayerMidfield1() != null) {
            dto.setPlayerMidfield1(PlayerDto.fromEntity(manager.getPlayerMidfield1()));
        }
        if (manager.getPlayerMidfield2() != null) {
            dto.setPlayerMidfield2(PlayerDto.fromEntity(manager.getPlayerMidfield2()));
        }
        if (manager.getPlayerMidfield3() != null) {
            dto.setPlayerMidfield3(PlayerDto.fromEntity(manager.getPlayerMidfield3()));
        }
        if (manager.getPlayerStriker1() != null) {
            dto.setPlayerStriker1(PlayerDto.fromEntity(manager.getPlayerStriker1()));
        }
        if (manager.getPlayerStriker2() != null) {
            dto.setPlayerStriker2(PlayerDto.fromEntity(manager.getPlayerStriker2()));
        }
        if (manager.getPlayerStriker3() != null) {
            dto.setPlayerStriker3(PlayerDto.fromEntity(manager.getPlayerStriker3()));
        }
        if (manager.getPlayerFreeChoice() != null) {
            dto.setPlayerFreeChoice(PlayerDto.fromEntity(manager.getPlayerFreeChoice()));
        }
        
        if (manager.getPlayerExchangedOld1() != null) {
            dto.setPlayerExchangedOld1(PlayerDto.fromEntity(manager.getPlayerExchangedOld1()));
        }
        if (manager.getPlayerExchangedOld2() != null) {
            dto.setPlayerExchangedOld2(PlayerDto.fromEntity(manager.getPlayerExchangedOld2()));
        }
        if (manager.getPlayerExchangedOld3() != null) {
            dto.setPlayerExchangedOld3(PlayerDto.fromEntity(manager.getPlayerExchangedOld3()));
        }
        if (manager.getPlayerExchangedNew1() != null) {
            dto.setPlayerExchangedNew1(PlayerDto.fromEntity(manager.getPlayerExchangedNew1()));
        }
        if (manager.getPlayerExchangedNew2() != null) {
            dto.setPlayerExchangedNew2(PlayerDto.fromEntity(manager.getPlayerExchangedNew2()));
        }
        if (manager.getPlayerExchangedNew3() != null) {
            dto.setPlayerExchangedNew3(PlayerDto.fromEntity(manager.getPlayerExchangedNew3()));
        }
        
        return dto;
    }
    
    private static int calculateTeamValue(Manager manager) {
        int value = 0;
        if (manager.getPlayerGoalkeeper() != null) value += manager.getPlayerGoalkeeper().getPrize();
        if (manager.getPlayerDefender1() != null) value += manager.getPlayerDefender1().getPrize();
        if (manager.getPlayerDefender2() != null) value += manager.getPlayerDefender2().getPrize();
        if (manager.getPlayerDefender3() != null) value += manager.getPlayerDefender3().getPrize();
        if (manager.getPlayerMidfield1() != null) value += manager.getPlayerMidfield1().getPrize();
        if (manager.getPlayerMidfield2() != null) value += manager.getPlayerMidfield2().getPrize();
        if (manager.getPlayerMidfield3() != null) value += manager.getPlayerMidfield3().getPrize();
        if (manager.getPlayerStriker1() != null) value += manager.getPlayerStriker1().getPrize();
        if (manager.getPlayerStriker2() != null) value += manager.getPlayerStriker2().getPrize();
        if (manager.getPlayerStriker3() != null) value += manager.getPlayerStriker3().getPrize();
        if (manager.getPlayerFreeChoice() != null) value += manager.getPlayerFreeChoice().getPrize();
        return value;
    }

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
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Integer getTeamValue() { return teamValue; }
    public void setTeamValue(Integer teamValue) { this.teamValue = teamValue; }
    public String getPaymentState() { return paymentState; }
    public void setPaymentState(String paymentState) { this.paymentState = paymentState; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getSeasonId() { return seasonId; }
    public void setSeasonId(Long seasonId) { this.seasonId = seasonId; }
    public String getSeasonName() { return seasonName; }
    public void setSeasonName(String seasonName) { this.seasonName = seasonName; }
    public PlayerDto getPlayerGoalkeeper() { return playerGoalkeeper; }
    public void setPlayerGoalkeeper(PlayerDto playerGoalkeeper) { this.playerGoalkeeper = playerGoalkeeper; }
    public PlayerDto getPlayerDefender1() { return playerDefender1; }
    public void setPlayerDefender1(PlayerDto playerDefender1) { this.playerDefender1 = playerDefender1; }
    public PlayerDto getPlayerDefender2() { return playerDefender2; }
    public void setPlayerDefender2(PlayerDto playerDefender2) { this.playerDefender2 = playerDefender2; }
    public PlayerDto getPlayerDefender3() { return playerDefender3; }
    public void setPlayerDefender3(PlayerDto playerDefender3) { this.playerDefender3 = playerDefender3; }
    public PlayerDto getPlayerMidfield1() { return playerMidfield1; }
    public void setPlayerMidfield1(PlayerDto playerMidfield1) { this.playerMidfield1 = playerMidfield1; }
    public PlayerDto getPlayerMidfield2() { return playerMidfield2; }
    public void setPlayerMidfield2(PlayerDto playerMidfield2) { this.playerMidfield2 = playerMidfield2; }
    public PlayerDto getPlayerMidfield3() { return playerMidfield3; }
    public void setPlayerMidfield3(PlayerDto playerMidfield3) { this.playerMidfield3 = playerMidfield3; }
    public PlayerDto getPlayerStriker1() { return playerStriker1; }
    public void setPlayerStriker1(PlayerDto playerStriker1) { this.playerStriker1 = playerStriker1; }
    public PlayerDto getPlayerStriker2() { return playerStriker2; }
    public void setPlayerStriker2(PlayerDto playerStriker2) { this.playerStriker2 = playerStriker2; }
    public PlayerDto getPlayerStriker3() { return playerStriker3; }
    public void setPlayerStriker3(PlayerDto playerStriker3) { this.playerStriker3 = playerStriker3; }
    public PlayerDto getPlayerFreeChoice() { return playerFreeChoice; }
    public void setPlayerFreeChoice(PlayerDto playerFreeChoice) { this.playerFreeChoice = playerFreeChoice; }
    public PlayerDto getPlayerExchangedOld1() { return playerExchangedOld1; }
    public void setPlayerExchangedOld1(PlayerDto playerExchangedOld1) { this.playerExchangedOld1 = playerExchangedOld1; }
    public PlayerDto getPlayerExchangedOld2() { return playerExchangedOld2; }
    public void setPlayerExchangedOld2(PlayerDto playerExchangedOld2) { this.playerExchangedOld2 = playerExchangedOld2; }
    public PlayerDto getPlayerExchangedOld3() { return playerExchangedOld3; }
    public void setPlayerExchangedOld3(PlayerDto playerExchangedOld3) { this.playerExchangedOld3 = playerExchangedOld3; }
    public PlayerDto getPlayerExchangedNew1() { return playerExchangedNew1; }
    public void setPlayerExchangedNew1(PlayerDto playerExchangedNew1) { this.playerExchangedNew1 = playerExchangedNew1; }
    public PlayerDto getPlayerExchangedNew2() { return playerExchangedNew2; }
    public void setPlayerExchangedNew2(PlayerDto playerExchangedNew2) { this.playerExchangedNew2 = playerExchangedNew2; }
    public PlayerDto getPlayerExchangedNew3() { return playerExchangedNew3; }
    public void setPlayerExchangedNew3(PlayerDto playerExchangedNew3) { this.playerExchangedNew3 = playerExchangedNew3; }
    public Integer getPointsTotal() { return pointsTotal; }
    public void setPointsTotal(Integer pointsTotal) { this.pointsTotal = pointsTotal; }
    public Integer getPointsLastRound() { return pointsLastRound; }
    public void setPointsLastRound(Integer pointsLastRound) { this.pointsLastRound = pointsLastRound; }
    public Integer getPositionTotal() { return positionTotal; }
    public void setPositionTotal(Integer positionTotal) { this.positionTotal = positionTotal; }
    public Integer getPositionLastRound() { return positionLastRound; }
    public void setPositionLastRound(Integer positionLastRound) { this.positionLastRound = positionLastRound; }
    public Integer getCurrentMatchday() { return currentMatchday; }
    public void setCurrentMatchday(Integer currentMatchday) { this.currentMatchday = currentMatchday; }
    public Integer getPositionChange() { return positionChange; }
    public void setPositionChange(Integer positionChange) { this.positionChange = positionChange; }
}