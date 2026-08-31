package de.ffl.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ffl_player")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String nameKicker;

    @Column(name = "kicker_id")
    private String kickerId;

    private String nameKickerAlt1;
    private String nameKickerAlt2;
    private String nameKickerAlt3;

    private String firstName;
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Position position;

    @Column(nullable = false)
    private Integer prize;

    private String pictureUrl;

    @Column(name = "aktiv", nullable = false)
    @ColumnDefault("true")
    @Builder.Default
    private Boolean aktiv = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "player_2_team",
        joinColumns = @JoinColumn(name = "player_id"),
        inverseJoinColumns = @JoinColumn(name = "team_id")
    )
    @JsonIgnore
    @Builder.Default
    private List<Team> teams = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id")
    @JsonIgnore
    private Season season;
}