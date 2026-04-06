package de.ffl.repository;

import de.ffl.domain.Points;
import de.ffl.domain.Player;
import de.ffl.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
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
}