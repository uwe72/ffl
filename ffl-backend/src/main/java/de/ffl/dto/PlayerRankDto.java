package de.ffl.dto;

import de.ffl.domain.PlayerRank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerRankDto {
    private Long roundId;
    private Integer roundNumber;
    private Integer pointsRound;
    private Integer pointsTotal;
    private Integer positionTotal;
    private Integer positionRound;
    private Boolean played;
    private String gameName;
    private Integer goalHost;
    private Integer goalVisitor;
    @Builder.Default
    private List<RulePointDto> rules = new ArrayList<>();

    public static PlayerRankDto fromEntity(PlayerRank rank) {
        return PlayerRankDto.builder()
            .roundId(rank.getRound().getId())
            .roundNumber(rank.getRound().getNumber())
            .pointsRound(rank.getPointsRound())
            .pointsTotal(rank.getPointsTotal())
            .positionTotal(rank.getPositionTotal())
            .positionRound(rank.getPositionRound())
            .played(rank.getPlayed())
            .rules(new ArrayList<>())
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RulePointDto {
        private String rule;
        private String ruleLabel;
        private Integer count;
        private Integer points;
    }
}
