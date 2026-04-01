package de.ffl.repository;

import de.ffl.domain.Manager;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ManagerRepository extends JpaRepository<Manager, Long> {
    List<Manager> findBySeason(Season season);
    List<Manager> findBySeasonId(Long seasonId);
    Optional<Manager> findByUserIdAndSeasonId(Long userId, Long seasonId);
}