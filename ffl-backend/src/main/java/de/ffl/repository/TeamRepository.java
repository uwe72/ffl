package de.ffl.repository;

import de.ffl.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    Optional<Team> findByName(String name);
    Optional<Team> findByShortName(String shortName);
    List<Team> findByNameContainingIgnoreCase(String name);

    @Query("SELECT t FROM Team t JOIN t.seasons s WHERE s.id = :seasonId ORDER BY t.name")
    List<Team> findBySeasonId(@Param("seasonId") Long seasonId);

    @Modifying
    @Query(value = "SELECT setval('ffl_team_seq', (SELECT COALESCE(MAX(id), 0) FROM ffl_team), true)", nativeQuery = true)
    void resetSequence();
}