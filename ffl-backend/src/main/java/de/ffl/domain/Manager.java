package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "ffl_manager")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Manager {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String shortName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(nullable = false)
    private Integer budget;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentState paymentState = PaymentState.NOT_PAID;

    private String description;

    @ManyToMany
    @JoinTable(
        name = "manager_2_player",
        joinColumns = @JoinColumn(name = "manager_id"),
        inverseJoinColumns = @JoinColumn(name = "player_id")
    )
    @Builder.Default
    private Set<Player> players = new HashSet<>();

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
    private Set<ManagerGroup> managerGroups = new HashSet<>();
}