package de.ffl.repository;

import de.ffl.domain.Game;
import de.ffl.domain.Round;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    List<Game> findByRound(Round round);
    List<Game> findByRoundId(Long roundId);
}