package de.ffl.repository;

import de.ffl.domain.Round;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoundRepository extends JpaRepository<Round, Long> {
    List<Round> findBySeason(Season season);
    List<Round> findBySeasonId(Long seasonId);
    List<Round> findBySeasonIdOrderByNumber(Long seasonId);
    Optional<Round> findBySeasonIdAndNumber(Long seasonId, Integer number);

    @Modifying
    @Query(value = "SELECT setval('ffl_round_seq', (SELECT COALESCE(MAX(id), 0) FROM ffl_round), true)", nativeQuery = true)
    void resetSequence();
}