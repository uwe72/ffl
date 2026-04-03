package de.ffl.repository;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findBySeason(Season season);
    List<Player> findBySeasonAndPosition(Season season, Position position);
    List<Player> findBySeasonId(Long seasonId);
    
    @Query("SELECT DISTINCT p FROM Player p JOIN p.teams t WHERE t.id = :teamId")
    List<Player> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.teams")
    List<Player> findAllWithTeams();

    @Query("SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.teams WHERE p.season.id = :seasonId")
    List<Player> findBySeasonIdWithTeams(@Param("seasonId") Long seasonId);

    @Query("SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.teams t WHERE t.id = :teamId")
    List<Player> findByTeamIdWithTeams(@Param("teamId") Long teamId);
}