package de.ffl.repository;

import de.ffl.domain.PlayerRank;
import de.ffl.domain.Player;
import de.ffl.domain.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRankRepository extends JpaRepository<PlayerRank, Long> {
    List<PlayerRank> findByPlayer(Player player);
    List<PlayerRank> findByRound(Round round);
    List<PlayerRank> findByRoundId(Long roundId);
    List<PlayerRank> findByPlayerId(Long playerId);
    Optional<PlayerRank> findByPlayerIdAndRoundId(Long playerId, Long roundId);
    
    @Query("SELECT pr FROM PlayerRank pr WHERE pr.player.id IN :playerIds")
    List<PlayerRank> findByPlayerIdIn(@Param("playerIds") List<Long> playerIds);

    @Query("SELECT pr FROM PlayerRank pr LEFT JOIN FETCH pr.round WHERE pr.player.id IN :playerIds")
    List<PlayerRank> findByPlayerIdInWithRound(@Param("playerIds") List<Long> playerIds);

    @Query("SELECT pr FROM PlayerRank pr LEFT JOIN FETCH pr.player WHERE pr.round.id = :roundId AND pr.played = true")
    List<PlayerRank> findByRoundIdAndPlayedTrue(@Param("roundId") Long roundId);
}