package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "ffl_team")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String shortName;
    private String logoXxlUrl;
    private String logoSUrl;

    @ManyToMany(mappedBy = "teams")
    @Builder.Default
    private Set<Season> seasons = new HashSet<>();
}