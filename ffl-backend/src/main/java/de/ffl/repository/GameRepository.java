package de.ffl.repository;

import de.ffl.domain.Game;
import de.ffl.domain.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    List<Game> findByRound(Round round);
    List<Game> findByRoundId(Long roundId);
    List<Game> findByRoundSeasonId(Long seasonId);

    @Query("SELECT MAX(g.round.number) FROM Game g " +
           "LEFT JOIN Points p ON p.game = g " +
           "WHERE g.round.season.id = :seasonId " +
           "AND ((g.formationExtern IS NOT NULL AND g.formationExtern != '') OR p.id IS NOT NULL)")
    Integer findMaxRoundWithFormationOrPoints(@Param("seasonId") Long seasonId);
}