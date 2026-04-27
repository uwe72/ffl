package de.ffl.repository;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerGroup;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManagerGroupRepository extends JpaRepository<ManagerGroup, Long> {
    List<ManagerGroup> findBySeason(Season season);
    List<ManagerGroup> findBySeasonId(Long seasonId);
    
    @Query("SELECT mg FROM ManagerGroup mg JOIN mg.managers m WHERE m.id = :managerId")
    List<ManagerGroup> findByManagerId(@Param("managerId") Long managerId);

    @Query("SELECT mg FROM ManagerGroup mg WHERE mg.name <> 'Alle' " +
           "AND ((mg.id IN (SELECT mg2.id FROM ManagerGroup mg2 JOIN mg2.managers m WHERE m.id = :managerId) AND mg.emailTo = de.ffl.domain.ManagerGroup$EmailToOption.ALL_MANAGERS) " +
           "OR (mg.createdBy.id = :userId AND mg.emailTo = de.ffl.domain.ManagerGroup$EmailToOption.CREATOR_ONLY))")
    List<ManagerGroup> findGroupsForMail(@Param("managerId") Long managerId, @Param("userId") Long userId);

    @Query("SELECT DISTINCT mg FROM ManagerGroup mg JOIN FETCH mg.managers WHERE mg.id IN (SELECT mg2.id FROM ManagerGroup mg2 JOIN mg2.managers m WHERE m.id = :managerId AND mg2.name <> 'Alle')")
    List<ManagerGroup> findByManagerIdWithManagers(@Param("managerId") Long managerId);

    @Query(value = "SELECT mgm.manager_group_id, mgm.manager_id, mg.creator_user_id, mg.email_to FROM manager_group_2_manager mgm " +
           "JOIN ffl_manager_group mg ON mg.id = mgm.manager_group_id " +
           "WHERE mg.name <> 'Alle' " +
           "AND mg.id IN (" +
           "  SELECT mg2.id FROM ffl_manager_group mg2 " +
           "  LEFT JOIN manager_group_2_manager mgm2 ON mg2.id = mgm2.manager_group_id " +
           "  WHERE (mgm2.manager_id = :managerId AND mg2.email_to = 'ALL_MANAGERS') " +
           "  OR (mg2.creator_user_id = :userId AND mg2.email_to = 'CREATOR_ONLY')" +
           ")", nativeQuery = true)
    List<Object[]> findGroupManagerIdsForMail(@Param("managerId") Long managerId, @Param("userId") Long userId);

    List<ManagerGroup> findByCreatedById(Long userId);

    @Query("SELECT mg FROM ManagerGroup mg WHERE mg.season.id = :seasonId AND mg.name <> 'Alle'")
    List<ManagerGroup> findBySeasonIdFiltered(@Param("seasonId") Long seasonId);

    @Query("SELECT DISTINCT mg FROM ManagerGroup mg JOIN FETCH mg.managers WHERE mg.id = :id")
    java.util.Optional<ManagerGroup> findByIdWithManagers(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE ManagerGroup mg SET mg.createdBy = null WHERE mg.createdBy.id = :userId")
    void clearCreatedByForUser(@Param("userId") Long userId);
}
