package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "ffl_manager_group")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ManagerGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_user_id")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_to")
    @Builder.Default
    private EmailToOption emailTo = EmailToOption.ALL_MANAGERS;

    @ManyToMany
    @JoinTable(
        name = "manager_group_2_manager",
        joinColumns = @JoinColumn(name = "manager_group_id"),
        inverseJoinColumns = @JoinColumn(name = "manager_id")
    )
    @Builder.Default
    private Set<Manager> managers = new HashSet<>();

    public enum EmailToOption {
        ALL_MANAGERS,
        CREATOR_ONLY
    }
}