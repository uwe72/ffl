package de.ffl.service;

import de.ffl.domain.FriendTeam;
import de.ffl.domain.Manager;
import de.ffl.domain.Season;
import de.ffl.domain.User;
import de.ffl.dto.AddFavoriteRequest;
import de.ffl.dto.FriendTeamDto;
import de.ffl.dto.SetStandardRequest;
import de.ffl.repository.FriendTeamRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FriendTeamService {

    public static final int MAX_FAVORITES = 10;

    private final FriendTeamRepository friendTeamRepository;
    private final UserRepository userRepository;
    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;

    public FriendTeamService(FriendTeamRepository friendTeamRepository,
                             UserRepository userRepository,
                             SeasonRepository seasonRepository,
                             ManagerRepository managerRepository) {
        this.friendTeamRepository = friendTeamRepository;
        this.userRepository = userRepository;
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
    }

    @Transactional(readOnly = true)
    public List<FriendTeamDto> listFavorites(Long userId, Long seasonId) {
        return friendTeamRepository.findByOwnerUserIdAndSeasonIdOrderByPositionAsc(userId, seasonId)
            .stream()
            .map(FriendTeamDto::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional
    public FriendTeamDto addFavorite(Long userId, AddFavoriteRequest request) {
        User owner = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Benutzer nicht gefunden."));
        Season season = seasonRepository.findById(request.getSeasonId())
            .orElseThrow(() -> new IllegalArgumentException("Saison nicht gefunden."));
        Manager friend = managerRepository.findById(request.getFriendManagerId())
            .orElseThrow(() -> new IllegalArgumentException("Team nicht gefunden."));
        if (friend.getSeason() == null || !friend.getSeason().getId().equals(season.getId())) {
            throw new IllegalArgumentException("Team gehört nicht zur gewählten Saison.");
        }

        if (friendTeamRepository.findByOwnerUserIdAndSeasonIdAndFriendManagerId(userId, season.getId(), friend.getId()).isPresent()) {
            throw new IllegalArgumentException("Team ist bereits ein Favorit.");
        }
        long count = friendTeamRepository.countByOwnerUserIdAndSeasonId(userId, season.getId());
        if (count >= MAX_FAVORITES) {
            throw new IllegalArgumentException("Maximal " + MAX_FAVORITES + " Favoriten möglich.");
        }

        FriendTeam friendTeam = FriendTeam.builder()
            .ownerUser(owner)
            .season(season)
            .friendManager(friend)
            .position((int) count)
            .standard(false)
            .build();
        return FriendTeamDto.fromEntity(friendTeamRepository.save(friendTeam));
    }

    @Transactional
    public void removeFavorite(Long userId, Long seasonId, Long friendManagerId) {
        FriendTeam friendTeam = friendTeamRepository
            .findByOwnerUserIdAndSeasonIdAndFriendManagerId(userId, seasonId, friendManagerId)
            .orElseThrow(() -> new IllegalArgumentException("Team ist kein Favorit."));
        friendTeamRepository.delete(friendTeam);
        resequence(userId, seasonId);
    }

    @Transactional
    public FriendTeamDto setStandard(Long userId, SetStandardRequest request) {
        Season season = seasonRepository.findById(request.getSeasonId())
            .orElseThrow(() -> new IllegalArgumentException("Saison nicht gefunden."));

        friendTeamRepository.clearStandard(userId, season.getId());

        if (request.getFriendManagerId() == null) {
            return null;
        }

        List<FriendTeam> favorites = friendTeamRepository
            .findByOwnerUserIdAndSeasonIdOrderByPositionAsc(userId, season.getId());

        FriendTeam target = favorites.stream()
            .filter(f -> f.getFriendManager().getId().equals(request.getFriendManagerId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Team ist kein Favorit."));

        target.setStandard(true);
        favorites.remove(target);
        favorites.add(0, target);
        for (int i = 0; i < favorites.size(); i++) {
            favorites.get(i).setPosition(i);
        }
        friendTeamRepository.saveAll(favorites);
        return FriendTeamDto.fromEntity(target);
    }

    private void resequence(Long userId, Long seasonId) {
        List<FriendTeam> favorites = friendTeamRepository
            .findByOwnerUserIdAndSeasonIdOrderByPositionAsc(userId, seasonId);
        for (int i = 0; i < favorites.size(); i++) {
            FriendTeam favorite = favorites.get(i);
            if (favorite.getPosition() != i) {
                favorite.setPosition(i);
                friendTeamRepository.save(favorite);
            }
        }
    }

    @Transactional
    public void seedInitialFavorite(Manager manager) {
        if (manager == null || manager.getUser() == null || manager.getSeason() == null) {
            return;
        }
        Long userId = manager.getUser().getId();
        Long seasonId = manager.getSeason().getId();
        if (friendTeamRepository.findByOwnerUserIdAndSeasonIdAndFriendManagerId(userId, seasonId, manager.getId()).isPresent()) {
            return;
        }
        FriendTeam friendTeam = FriendTeam.builder()
            .ownerUser(manager.getUser())
            .season(manager.getSeason())
            .friendManager(manager)
            .position(0)
            .standard(false)
            .build();
        friendTeamRepository.save(friendTeam);
    }
}
