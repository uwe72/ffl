package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "ffl_season_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class SeasonHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String saison;

    @Column(nullable = false, precision = 10, scale = 1)
    private BigDecimal budget;

    @Column(name = "anzahl_manager", nullable = false)
    private Integer anzahlManager;
}
