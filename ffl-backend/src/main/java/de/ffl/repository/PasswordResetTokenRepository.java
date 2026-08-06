package de.ffl.repository;

import de.ffl.domain.PasswordResetToken;
import de.ffl.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);
    void deleteByExpiryDateBefore(LocalDateTime dateTime);
    void deleteByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.user.role <> :role")
    void deleteByUserRoleNot(@Param("role") UserRole role);
}
