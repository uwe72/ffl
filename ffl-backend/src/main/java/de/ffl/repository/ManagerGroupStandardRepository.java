package de.ffl.repository;

import de.ffl.domain.ManagerGroupStandard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ManagerGroupStandardRepository extends JpaRepository<ManagerGroupStandard, Long> {
    Optional<ManagerGroupStandard> findByOwner_Id(Long ownerUserId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM ManagerGroupStandard s WHERE s.owner.id = :ownerUserId")
    int deleteByOwnerUserId(@Param("ownerUserId") Long ownerUserId);
}
