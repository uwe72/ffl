package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ffl_player_rank")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PlayerRank {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id")
    private Round round;

    @Column(nullable = false)
    private Integer positionTotal;

    @Column(nullable = false)
    private Integer positionRound;

    @Column(nullable = false)
    private Integer pointsTotal;

    @Column(nullable = false)
    private Integer pointsRound;

    @Column(nullable = false)
    private Integer numberMatches;

    @Column(nullable = false)
    private Boolean played;
}