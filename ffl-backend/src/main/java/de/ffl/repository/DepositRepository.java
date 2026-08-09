package de.ffl.repository;

import de.ffl.domain.Deposit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepositRepository extends JpaRepository<Deposit, Long> {

    List<Deposit> findBySeasonId(Long seasonId);

    Optional<Deposit> findBySeasonIdAndManagerId(Long seasonId, Long managerId);

    @Modifying
    @Query("DELETE FROM Deposit d WHERE d.season.id = :seasonId")
    void deleteBySeasonId(@Param("seasonId") Long seasonId);
}
