package de.ffl.repository;

import de.ffl.domain.Points;
import de.ffl.domain.Player;
import de.ffl.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointsRepository extends JpaRepository<Points, Long> {
    List<Points> findByPlayer(Player player);
    List<Points> findByPlayerId(Long playerId);
    List<Points> findByGame(Game game);
    List<Points> findByGameId(Long gameId);
    List<Points> findByPlayerIdAndGameId(Long playerId, Long gameId);
    List<Points> findByPlayerIdAndGameIdIn(Long playerId, List<Long> gameIds);
    List<Points> findByGameIdIn(List<Long> gameIds);
    List<Points> findByPlayerIdInAndGameIdIn(List<Long> playerIds, List<Long> gameIds);
    
    void deleteByGameId(Long gameId);

    @Query("SELECT p FROM Points p LEFT JOIN FETCH p.game g LEFT JOIN FETCH g.round WHERE p.player.id = :playerId")
    List<Points> findByPlayerIdWithGameAndRound(@Param("playerId") Long playerId);
}