package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ffl_prize_distribution_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PrizeDistributionLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(name = "total_participants", nullable = false)
    private Integer totalParticipants;

    @Column(name = "paying_participants", nullable = false)
    private Integer payingParticipants;

    @Column(name = "total_stakes", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalStakes;

    @Column(name = "server_costs", nullable = false, precision = 10, scale = 2)
    private BigDecimal serverCosts;

    @Column(name = "total_budget", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalBudget;

    @Column(name = "num_winning_ranks", nullable = false)
    private Integer numWinningRanks;

    @Column(name = "prize_first_place", nullable = false, precision = 10, scale = 2)
    private BigDecimal prizeFirstPlace;

    @Column(name = "prize_last_place", nullable = false, precision = 10, scale = 2)
    private BigDecimal prizeLastPlace;

    @Column(name = "curvature_factor", nullable = false)
    private Double curvatureFactor;

    @Column(name = "correction_amount")
    private Integer correctionAmount;

    @Column(name = "statistics_html", columnDefinition = "TEXT", nullable = false)
    private String statisticsHtml;

    @Column(name = "base_prizes", columnDefinition = "TEXT")
    private String basePrizes;

    @Column(name = "calculated_at", nullable = false)
    private LocalDateTime calculatedAt;
}
