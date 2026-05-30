package de.ffl.repository;

import de.ffl.domain.EmailAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailAddressRepository extends JpaRepository<EmailAddress, Long> {
    Optional<EmailAddress> findByEmail(String email);
    boolean existsByEmail(String email);
    List<EmailAddress> findByEmailContainingIgnoreCase(String keyword);
}