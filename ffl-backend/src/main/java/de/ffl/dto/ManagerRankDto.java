package de.ffl.dto;

import de.ffl.domain.ManagerRank;

public class ManagerRankDto {
    private Long id;
    private Long roundId;
    private Integer roundNumber;
    private Integer pointsRound;
    private Integer pointsTotal;
    private Integer positionRound;
    private Integer positionTotal;

    public static ManagerRankDto fromEntity(ManagerRank rank) {
        ManagerRankDto dto = new ManagerRankDto();
        dto.setId(rank.getId());
        if (rank.getRound() != null) {
            dto.setRoundId(rank.getRound().getId());
            dto.setRoundNumber(rank.getRound().getNumber());
        }
        dto.setPointsRound(rank.getPointsRound());
        dto.setPointsTotal(rank.getPointsTotal());
        dto.setPositionRound(rank.getPositionRound());
        dto.setPositionTotal(rank.getPositionTotal());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
}
