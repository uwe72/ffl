package de.ffl.repository;

import de.ffl.domain.PlayerRank;
import de.ffl.domain.Player;
import de.ffl.domain.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRankRepository extends JpaRepository<PlayerRank, Long> {
    List<PlayerRank> findByPlayer(Player player);
    List<PlayerRank> findByRound(Round round);
    List<PlayerRank> findByRoundId(Long roundId);
    Optional<PlayerRank> findByPlayerIdAndRoundId(Long playerId, Long roundId);
}