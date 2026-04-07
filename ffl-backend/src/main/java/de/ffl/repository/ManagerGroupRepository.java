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
    
    @Query("SELECT DISTINCT mg FROM ManagerGroup mg JOIN FETCH mg.managers WHERE mg.id IN (SELECT mg2.id FROM ManagerGroup mg2 JOIN mg2.managers m WHERE m.id = :managerId AND mg2.name <> 'Alle')")
    List<ManagerGroup> findByManagerIdWithManagers(@Param("managerId") Long managerId);

    List<ManagerGroup> findByCreatedById(Long userId);

    @Query("SELECT mg FROM ManagerGroup mg WHERE mg.season.id = :seasonId AND mg.name <> 'Alle'")
    List<ManagerGroup> findBySeasonIdFiltered(@Param("seasonId") Long seasonId);

    @Query("SELECT DISTINCT mg FROM ManagerGroup mg JOIN FETCH mg.managers WHERE mg.id = :id")
    java.util.Optional<ManagerGroup> findByIdWithManagers(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE ManagerGroup mg SET mg.createdBy = null WHERE mg.createdBy.id = :userId")
    void clearCreatedByForUser(@Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM manager_group_2_manager", nativeQuery = true)
    void deleteAllManagerRelations();

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "INSERT INTO manager_group_2_manager (manager_group_id, manager_id) VALUES (:managerGroupId, :managerId)", nativeQuery = true)
    void addManagerRelation(Long managerGroupId, Long managerId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "SELECT setval('ffl_manager_group_seq', (SELECT COALESCE(MAX(id), 0) FROM ffl_manager_group), true)", nativeQuery = true)
    void resetSequence();
}