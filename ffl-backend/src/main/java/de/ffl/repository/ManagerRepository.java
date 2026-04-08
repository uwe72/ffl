package de.ffl.repository;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ManagerRepository extends JpaRepository<Manager, Long> {
    List<Manager> findBySeason(Season season);
    List<Manager> findBySeasonId(Long seasonId);
    Optional<Manager> findByUserIdAndSeasonId(Long userId, Long seasonId);
    Manager findByUserId(Long userId);
    
    @Query("SELECT DISTINCT m FROM Manager m " +
           "LEFT JOIN m.playerGoalkeeper pg " +
           "LEFT JOIN m.playerDefender1 pd1 " +
           "LEFT JOIN m.playerDefender2 pd2 " +
           "LEFT JOIN m.playerDefender3 pd3 " +
           "LEFT JOIN m.playerMidfield1 pm1 " +
           "LEFT JOIN m.playerMidfield2 pm2 " +
           "LEFT JOIN m.playerMidfield3 pm3 " +
           "LEFT JOIN m.playerStriker1 ps1 " +
           "LEFT JOIN m.playerStriker2 ps2 " +
           "LEFT JOIN m.playerStriker3 ps3 " +
           "LEFT JOIN m.playerFreeChoice pfc " +
           "LEFT JOIN m.playerExchangedNew1 pen1 " +
           "LEFT JOIN m.playerExchangedNew2 pen2 " +
           "LEFT JOIN m.playerExchangedNew3 pen3 " +
           "WHERE pg.id = :playerId " +
           "OR pd1.id = :playerId " +
           "OR pd2.id = :playerId " +
           "OR pd3.id = :playerId " +
           "OR pm1.id = :playerId " +
           "OR pm2.id = :playerId " +
           "OR pm3.id = :playerId " +
           "OR ps1.id = :playerId " +
           "OR ps2.id = :playerId " +
           "OR ps3.id = :playerId " +
           "OR pfc.id = :playerId " +
           "OR pen1.id = :playerId " +
           "OR pen2.id = :playerId " +
           "OR pen3.id = :playerId")
    List<Manager> findManagersByPlayerId(@Param("playerId") Long playerId);
    
    @Query("SELECT m FROM Manager m " +
           "LEFT JOIN FETCH m.user " +
           "LEFT JOIN FETCH m.season " +
           "LEFT JOIN FETCH m.playerGoalkeeper " +
           "LEFT JOIN FETCH m.playerDefender1 " +
           "LEFT JOIN FETCH m.playerDefender2 " +
           "LEFT JOIN FETCH m.playerDefender3 " +
           "LEFT JOIN FETCH m.playerMidfield1 " +
           "LEFT JOIN FETCH m.playerMidfield2 " +
           "LEFT JOIN FETCH m.playerMidfield3 " +
           "LEFT JOIN FETCH m.playerStriker1 " +
           "LEFT JOIN FETCH m.playerStriker2 " +
           "LEFT JOIN FETCH m.playerStriker3 " +
           "LEFT JOIN FETCH m.playerFreeChoice " +
           "LEFT JOIN FETCH m.playerExchangedOld1 " +
           "LEFT JOIN FETCH m.playerExchangedOld2 " +
           "LEFT JOIN FETCH m.playerExchangedOld3 " +
           "LEFT JOIN FETCH m.playerExchangedNew1 " +
           "LEFT JOIN FETCH m.playerExchangedNew2 " +
           "LEFT JOIN FETCH m.playerExchangedNew3")
    List<Manager> findAllWithPlayers();
    
    @Query("SELECT m FROM Manager m " +
           "LEFT JOIN FETCH m.user " +
           "LEFT JOIN FETCH m.season " +
           "LEFT JOIN FETCH m.playerGoalkeeper " +
           "LEFT JOIN FETCH m.playerDefender1 " +
           "LEFT JOIN FETCH m.playerDefender2 " +
           "LEFT JOIN FETCH m.playerDefender3 " +
           "LEFT JOIN FETCH m.playerMidfield1 " +
           "LEFT JOIN FETCH m.playerMidfield2 " +
           "LEFT JOIN FETCH m.playerMidfield3 " +
           "LEFT JOIN FETCH m.playerStriker1 " +
           "LEFT JOIN FETCH m.playerStriker2 " +
           "LEFT JOIN FETCH m.playerStriker3 " +
           "LEFT JOIN FETCH m.playerFreeChoice " +
           "LEFT JOIN FETCH m.playerExchangedOld1 " +
           "LEFT JOIN FETCH m.playerExchangedOld2 " +
           "LEFT JOIN FETCH m.playerExchangedOld3 " +
           "LEFT JOIN FETCH m.playerExchangedNew1 " +
           "LEFT JOIN FETCH m.playerExchangedNew2 " +
           "LEFT JOIN FETCH m.playerExchangedNew3 " +
           "WHERE m.season.id = :seasonId")
    List<Manager> findBySeasonIdWithPlayers(@Param("seasonId") Long seasonId);

    @Query("SELECT COUNT(m) FROM Manager m " +
           "WHERE m.playerGoalkeeper.id = :playerId " +
           "OR m.playerDefender1.id = :playerId " +
           "OR m.playerDefender2.id = :playerId " +
           "OR m.playerDefender3.id = :playerId " +
           "OR m.playerMidfield1.id = :playerId " +
           "OR m.playerMidfield2.id = :playerId " +
           "OR m.playerMidfield3.id = :playerId " +
           "OR m.playerStriker1.id = :playerId " +
           "OR m.playerStriker2.id = :playerId " +
           "OR m.playerStriker3.id = :playerId " +
           "OR m.playerFreeChoice.id = :playerId " +
           "OR m.playerExchangedNew1.id = :playerId " +
           "OR m.playerExchangedNew2.id = :playerId " +
           "OR m.playerExchangedNew3.id = :playerId")
    Long countManagersByPlayerId(@Param("playerId") Long playerId);

    @Query("SELECT p.id as playerId, COUNT(m) as managerCount FROM Player p " +
           "LEFT JOIN Manager m ON " +
           "m.playerGoalkeeper.id = p.id " +
           "OR m.playerDefender1.id = p.id " +
           "OR m.playerDefender2.id = p.id " +
           "OR m.playerDefender3.id = p.id " +
           "OR m.playerMidfield1.id = p.id " +
           "OR m.playerMidfield2.id = p.id " +
           "OR m.playerMidfield3.id = p.id " +
           "OR m.playerStriker1.id = p.id " +
           "OR m.playerStriker2.id = p.id " +
           "OR m.playerStriker3.id = p.id " +
           "OR m.playerFreeChoice.id = p.id " +
           "OR m.playerExchangedNew1.id = p.id " +
           "OR m.playerExchangedNew2.id = p.id " +
           "OR m.playerExchangedNew3.id = p.id " +
           "WHERE p.id IN :playerIds " +
           "GROUP BY p.id")
    List<Object[]> countManagersByPlayerIdIn(@Param("playerIds") List<Long> playerIds);

    List<Manager> findAllByUserId(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM manager_2_player WHERE manager_id = :managerId", nativeQuery = true)
    void deletePlayerRelationsByManagerId(@Param("managerId") Long managerId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM manager_group_2_manager WHERE manager_id = :managerId", nativeQuery = true)
    void deleteGroupRelationsByManagerId(@Param("managerId") Long managerId);
}
