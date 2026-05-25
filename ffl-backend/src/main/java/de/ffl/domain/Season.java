package de.ffl.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "ffl_season")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Season {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
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

    @Column(name = "start_round_rueckrunde")
    @Builder.Default
    private Integer startRoundRueckrunde = 16;

    @Column(name = "current_matchday")
    private Integer currentMatchday;

    @Column(name = "spieleinsatz_euro", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal spieleinsatzEuro = new BigDecimal("10.00");

    @Column(name = "serverkosten_euro", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal serverkostenEuro = new BigDecimal("60.00");

    @Column(name = "anzahl_spielleiter")
    @Builder.Default
    private Integer anzahlSpielleiter = 2;

    @Column(name = "gewinn_erster_platz_prozent")
    @Builder.Default
    private Integer gewinnErsterPlatzProzent = 10;

    @Column(name = "gewinn_letzter_platz_euro", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal gewinnLetzterPlatzEuro = new BigDecimal("15.00");

    @Column(name = "mail_text", columnDefinition = "TEXT")
    private String mailText;

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
    @JsonIgnore
    private Set<Manager> managers = new HashSet<>();

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL)
    @Builder.Default
    @JsonIgnore
    private Set<Player> players = new HashSet<>();

    @OneToMany(mappedBy = "season", cascade = CascadeType.ALL)
    @Builder.Default
    @JsonIgnore
    private Set<Round> rounds = new HashSet<>();
}