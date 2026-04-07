package de.ffl.repository;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    @Query("SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.teams WHERE p.season.id = :seasonId AND " +
           "(LOWER(p.nameKicker) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.nameKickerAlt1) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.nameKickerAlt2) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.nameKickerAlt3) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<Player> searchBySeasonIdAndName(@Param("seasonId") Long seasonId, @Param("searchTerm") String searchTerm);

    @Query("SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.teams t WHERE t.id = :teamId AND p.season.id = :seasonId")
    List<Player> findByTeamIdAndSeasonId(@Param("teamId") Long teamId, @Param("seasonId") Long seasonId);

    @Modifying
    @Query(value = "SELECT setval('ffl_player_seq', (SELECT COALESCE(MAX(id), 0) FROM ffl_player), true)", nativeQuery = true)
    void resetSequence();
}