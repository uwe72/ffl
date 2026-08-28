package de.ffl.repository;

import de.ffl.domain.FriendTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendTeamRepository extends JpaRepository<FriendTeam, Long> {

    List<FriendTeam> findByOwnerUserIdAndSeasonIdOrderByPositionAsc(Long ownerUserId, Long seasonId);

    Optional<FriendTeam> findByOwnerUserIdAndSeasonIdAndFriendManagerId(Long ownerUserId, Long seasonId, Long friendManagerId);

    Optional<FriendTeam> findByOwnerUserIdAndSeasonIdAndStandardTrue(Long ownerUserId, Long seasonId);

    long countByOwnerUserIdAndSeasonId(Long ownerUserId, Long seasonId);
}
