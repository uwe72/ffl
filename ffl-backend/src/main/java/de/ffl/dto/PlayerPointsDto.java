package de.ffl.dto;

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
public class PlayerPointsDto {
    private Long playerId;
    private String playerName;
    private String nameKickerAlt1;
    private String nameKickerAlt2;
    private String nameKickerAlt3;
    private String pictureUrl;
    private String position;
    private Integer totalPoints;
    @Builder.Default
    private List<RulePointDto> rules = new ArrayList<>();

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
