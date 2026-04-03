package de.ffl.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "ffl_team")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String name;

    private String shortName;
    private String logoXxlUrl;
    private String logoSUrl;

    @ManyToMany(mappedBy = "teams")
    @Builder.Default
    @JsonIgnore
    private Set<Season> seasons = new HashSet<>();

    @ManyToMany(mappedBy = "teams")
    @Builder.Default
    @JsonIgnore
    private List<Player> players = new ArrayList<>();
}