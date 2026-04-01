package de.ffl.repository;

import de.ffl.domain.ManagerRank;
import de.ffl.domain.Manager;
import de.ffl.domain.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ManagerRankRepository extends JpaRepository<ManagerRank, Long> {
    List<ManagerRank> findByManager(Manager manager);
    List<ManagerRank> findByRound(Round round);
    List<ManagerRank> findByRoundId(Long roundId);
    Optional<ManagerRank> findByManagerIdAndRoundId(Long managerId, Long roundId);
}