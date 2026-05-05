package de.ffl.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "ffl_manager")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Manager {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String name;

    private String shortName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    @JsonIgnore
    private Season season;

    @Column(nullable = false)
    private Integer budget;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentState paymentState = PaymentState.NOT_PAID;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MailTheme mailTheme = MailTheme.LIGHTMODE;

    @ManyToMany
    @JoinTable(
        name = "manager_2_player",
        joinColumns = @JoinColumn(name = "manager_id"),
        inverseJoinColumns = @JoinColumn(name = "player_id")
    )
    @Builder.Default
    @JsonIgnore
    private Set<Player> players = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_goalkeeper_id")
    private Player playerGoalkeeper;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_defender1_id")
    private Player playerDefender1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_defender2_id")
    private Player playerDefender2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_defender3_id")
    private Player playerDefender3;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_midfield1_id")
    private Player playerMidfield1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_midfield2_id")
    private Player playerMidfield2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_midfield3_id")
    private Player playerMidfield3;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_striker1_id")
    private Player playerStriker1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_striker2_id")
    private Player playerStriker2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_striker3_id")
    private Player playerStriker3;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_free_choice_id")
    private Player playerFreeChoice;

    @ManyToOne(fetch = FetchType.LAZY)
    private Player playerExchangedOld1;

    @ManyToOne(fetch = FetchType.LAZY)
    private Player playerExchangedOld2;

    @ManyToOne(fetch = FetchType.LAZY)
    private Player playerExchangedOld3;

    @ManyToOne(fetch = FetchType.LAZY)
    private Player playerExchangedNew1;

    @ManyToOne(fetch = FetchType.LAZY)
    private Player playerExchangedNew2;

    @ManyToOne(fetch = FetchType.LAZY)
    private Player playerExchangedNew3;

    @ManyToMany(mappedBy = "managers")
    @Builder.Default
    @JsonIgnore
    private Set<ManagerGroup> managerGroups = new HashSet<>();
}