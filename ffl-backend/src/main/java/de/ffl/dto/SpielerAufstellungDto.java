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
public class SpielerAufstellungDto {
    private Long id;
    private String name;
    private String firstName;
    private String lastName;
    private String vereinKuerzel;
    private String vereinLogoUrl;
    private String pictureUrl;
    private String position;
    private Boolean joker;
    private Integer punkteGesamt;
    private Integer punkteSpieltag;
    private Integer positionTotal;
    private Integer positionRound;
    private Integer marktwert;
    private Integer tore;
    private Integer zuNull;
    private Boolean gespielt;
    private String einsatzstatus;
    private Integer einsaetze;
    private Integer einsatzquote;
    private Boolean aktiv;
    @Builder.Default
    private List<RulePointDto> regeln = new ArrayList<>();

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
