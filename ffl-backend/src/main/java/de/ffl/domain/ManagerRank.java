package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ffl_manager_rank")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ManagerRank {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private Manager manager;

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
}