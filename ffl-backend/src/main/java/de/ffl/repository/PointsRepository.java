package de.ffl.repository;

import de.ffl.domain.Points;
import de.ffl.domain.Player;
import de.ffl.domain.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointsRepository extends JpaRepository<Points, Long> {
    List<Points> findByPlayer(Player player);
    List<Points> findByPlayerId(Long playerId);
    List<Points> findByRound(Round round);
}