package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrizeDistributionLogDto {
    private Integer totalParticipants;
    private Integer payingParticipants;
    private BigDecimal totalStakes;
    private BigDecimal serverCosts;
    private BigDecimal totalBudget;
    private Integer numWinningRanks;
    private BigDecimal prizeFirstPlace;
    private BigDecimal prizeLastPlace;
    private Double curvatureFactor;
    private Integer correctionAmount;
    private String statisticsHtml;
    private LocalDateTime calculatedAt;
    private List<BigDecimal> basePrizes;
}
