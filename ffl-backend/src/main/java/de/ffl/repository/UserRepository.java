package de.ffl.repository;

import de.ffl.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByLogin(String login);
    Optional<User> findByEmail(String email);
    boolean existsByLogin(String login);
    boolean existsByEmail(String email);

    @Modifying
    @Query(value = "SELECT setval('ffl_user_seq', (SELECT COALESCE(MAX(id), 0) FROM ffl_user), true)", nativeQuery = true)
    void resetSequence();
}