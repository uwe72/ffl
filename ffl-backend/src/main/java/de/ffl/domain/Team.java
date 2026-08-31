package de.ffl.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "Kurzname ist erforderlich")
    private String shortName;

    @Size(max = 22, message = "Slogan darf maximal 22 Zeichen lang sein")
    @Column(length = 60)
    private String slogan;

    private String logoXxlUrl;
    @Column(name = "logo_s_url")
    private String logoSUrl;

    @Column(name = "kicker_id")
    private String kickerId;

    @ManyToMany(mappedBy = "teams")
    @Builder.Default
    @JsonIgnore
    private Set<Season> seasons = new HashSet<>();

    @ManyToMany(mappedBy = "teams")
    @Builder.Default
    @JsonIgnore
    private List<Player> players = new ArrayList<>();
}