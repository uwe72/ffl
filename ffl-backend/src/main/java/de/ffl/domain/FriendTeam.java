package de.ffl.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ffl_friend_team", uniqueConstraints = {
    @UniqueConstraint(name = "uk_friend_team_owner_season_manager", columnNames = {"owner_user_id", "season_id", "friend_manager_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class FriendTeam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    @JsonIgnore
    private User ownerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    @JsonIgnore
    private Season season;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "friend_manager_id", nullable = false)
    private Manager friendManager;

    @Column(nullable = false)
    @Builder.Default
    private int position = 0;

    @Column(name = "is_standard", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean standard = false;
}
