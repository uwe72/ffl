package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "ffl_season")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Season {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer budget;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SeasonState seasonState = SeasonState.BEFORE_SEASON;

    private LocalDate finalRegistrationDate;

    @ManyToMany
    @JoinTable(
        name = "season_2_team",
        joinColumns = @JoinColumn(name = "season_id"),
        inverseJoinColumns = @JoinColumn(name = "team_id")
    )
    @Builder.Default
    private Set<Team> teams = new HashSet<>();

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL)
    @Builder.Default
    private Set<Manager> managers = new HashSet<>();

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL)
    @Builder.Default
    private Set<Player> players = new HashSet<>();

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL)
    @Builder.Default
    private Set<Round> rounds = new HashSet<>();
}