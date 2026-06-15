package de.ffl.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
    @JsonIgnore
    private Season season;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_user_id")
    @JsonIgnore
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_to")
    @Builder.Default
    private EmailToOption emailTo = EmailToOption.ALL_MANAGERS;

    @Lob
    private byte[] logo;

    private String logoContentType;

    @ManyToMany
    @JoinTable(
        name = "manager_group_2_manager",
        joinColumns = @JoinColumn(name = "manager_group_id"),
        inverseJoinColumns = @JoinColumn(name = "manager_id")
    )
    @Builder.Default
    @JsonIgnore
    private Set<Manager> managers = new HashSet<>();

    public enum EmailToOption {
        ALL_MANAGERS,
        CREATOR_ONLY
    }
}