package de.ffl.repository;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findBySeason(Season season);
    List<Player> findBySeasonAndPosition(Season season, Position position);
    List<Player> findBySeasonId(Long seasonId);
    List<Player> findByTeamId(Long teamId);
}