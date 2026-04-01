package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "ffl_manager_group")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManagerGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToMany
    @JoinTable(
        name = "manager_group_2_manager",
        joinColumns = @JoinColumn(name = "manager_group_id"),
        inverseJoinColumns = @JoinColumn(name = "manager_id")
    )
    @Builder.Default
    private Set<Manager> managers = new HashSet<>();
}