package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ffl_user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false, unique = true, length = 25)
    private String login;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String email;

    @Column(length = 25)
    private String firstName;

    @Column(length = 25)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.NORMAL;

    @Column(name = "visit_count")
    @Builder.Default
    private Integer visitCount = 0;

    @Column(columnDefinition = "bytea")
    private byte[] avatar;

    private String avatarContentType;
}