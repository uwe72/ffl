package de.ffl.repository;

import de.ffl.domain.PrizePayout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrizePayoutRepository extends JpaRepository<PrizePayout, Long> {
    
    List<PrizePayout> findBySeasonIdOrderByPositionAsc(Long seasonId);
    
    Optional<PrizePayout> findBySeasonIdAndManagerId(Long seasonId, Long managerId);
    
    @Modifying
    @Query("DELETE FROM PrizePayout p WHERE p.season.id = :seasonId")
    void deleteBySeasonId(@Param("seasonId") Long seasonId);
}
