package de.ffl.repository;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByLogin(String login);
    Optional<User> findByLoginIgnoreCase(String login);
    List<User> findAllByEmail(String email);
    boolean existsByLogin(String login);
    boolean existsByLoginIgnoreCase(String login);

    @Modifying
    @Query("DELETE FROM User u WHERE u.role <> :role")
    void deleteByRoleNot(@Param("role") UserRole role);
}
