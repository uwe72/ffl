package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ffl_prize_payout")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PrizePayout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private Manager manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "points_total", nullable = false)
    private Integer pointsTotal;

    @Column(name = "prize_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal prizeAmount;

    @Column(name = "payout_comment", columnDefinition = "TEXT")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_status", nullable = false)
    @Builder.Default
    private PayoutStatus payoutStatus = PayoutStatus.UNPAID;

    @Column(name = "calculated_at", nullable = false)
    private LocalDateTime calculatedAt;
}
