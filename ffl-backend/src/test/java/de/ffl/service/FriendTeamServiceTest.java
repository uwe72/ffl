package de.ffl.service;

import de.ffl.domain.FriendTeam;
import de.ffl.domain.Manager;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.AddFavoriteRequest;
import de.ffl.dto.FriendTeamDto;
import de.ffl.dto.SetStandardRequest;
import de.ffl.repository.FriendTeamRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FriendTeamServiceTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private FriendTeamService friendTeamService;
    @Autowired
    private FriendTeamRepository friendTeamRepository;
    @Autowired
    private ManagerRepository managerRepository;
    @Autowired
    private UserRepository userRepository;

    private Manager createManager(String login) {
        User user = User.builder()
            .login(login)
            .password("$2a$10$test")
            .email(login + "@test.de")
            .firstName("Vorname")
            .lastName("Nachname")
            .role(UserRole.NORMAL)
            .build();
        user = userRepository.save(user);
        Manager manager = Manager.builder()
            .user(user)
            .season(season)
            .budget(30000000)
            .build();
        return managerRepository.save(manager);
    }

    @Test
    void seedInitialFavorite_addsOwnTeam() {
        Manager owner = createManager("owner");
        friendTeamService.seedInitialFavorite(owner);

        List<FriendTeam> favorites = friendTeamRepository
            .findByOwnerUserIdAndSeasonIdOrderByPositionAsc(owner.getUser().getId(), season.getId());
        assertThat(favorites).hasSize(1);
        assertThat(favorites.get(0).getFriendManager().getId()).isEqualTo(owner.getId());
        assertThat(favorites.get(0).getPosition()).isZero();
    }

    @Test
    void addFavorite_createsFavorite() {
        Manager owner = createManager("owner");
        Manager friend = createManager("friend");

        FriendTeamDto dto = friendTeamService.addFavorite(owner.getUser().getId(), request(friend.getId()));

        assertThat(dto.getFriendManagerId()).isEqualTo(friend.getId());
        assertThat(dto.getPosition()).isZero();
        List<FriendTeamDto> list = friendTeamService.listFavorites(owner.getUser().getId(), season.getId());
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getFriendManagerId()).isEqualTo(friend.getId());
    }

    @Test
    void addFavorite_duplicate_throws() {
        Manager owner = createManager("owner");
        Manager friend = createManager("friend");
        friendTeamService.addFavorite(owner.getUser().getId(), request(friend.getId()));

        assertThatThrownBy(() -> friendTeamService.addFavorite(owner.getUser().getId(), request(friend.getId())))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("bereits ein Favorit");
    }

    @Test
    void addFavorite_limit_throws() {
        Manager owner = createManager("owner");
        Long userId = owner.getUser().getId();
        for (int i = 0; i < FriendTeamService.MAX_FAVORITES; i++) {
            Manager friend = createManager("friend" + i);
            friendTeamService.addFavorite(userId, request(friend.getId()));
        }
        Manager extra = createManager("friendExtra");

        assertThatThrownBy(() -> friendTeamService.addFavorite(userId, request(extra.getId())))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Maximal");
    }

    @Test
    void removeFavorite_resequencesPositions() {
        Manager owner = createManager("owner");
        Long userId = owner.getUser().getId();
        Manager friend1 = createManager("friend1");
        Manager friend2 = createManager("friend2");
        friendTeamService.addFavorite(userId, request(friend1.getId()));
        friendTeamService.addFavorite(userId, request(friend2.getId()));

        friendTeamService.removeFavorite(userId, season.getId(), friend1.getId());

        List<FriendTeamDto> list = friendTeamService.listFavorites(userId, season.getId());
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getFriendManagerId()).isEqualTo(friend2.getId());
        assertThat(list.get(0).getPosition()).isZero();
    }

    @Test
    void removeStandardFavorite_clearsStandard() {
        Manager owner = createManager("owner");
        Long userId = owner.getUser().getId();
        Manager friend = createManager("friend");
        friendTeamService.addFavorite(userId, request(friend.getId()));
        SetStandardRequest standard = new SetStandardRequest();
        standard.setSeasonId(season.getId());
        standard.setFriendManagerId(friend.getId());
        friendTeamService.setStandard(userId, standard);

        friendTeamService.removeFavorite(userId, season.getId(), friend.getId());

        assertThat(friendTeamService.listFavorites(userId, season.getId())).isEmpty();
    }

    @Test
    void setStandard_marksFavorite() {
        Manager owner = createManager("owner");
        Long userId = owner.getUser().getId();
        Manager friend1 = createManager("friend1");
        Manager friend2 = createManager("friend2");
        friendTeamService.addFavorite(userId, request(friend1.getId()));
        friendTeamService.addFavorite(userId, request(friend2.getId()));

        SetStandardRequest standard = new SetStandardRequest();
        standard.setSeasonId(season.getId());
        standard.setFriendManagerId(friend1.getId());
        FriendTeamDto dto = friendTeamService.setStandard(userId, standard);

        assertThat(dto.getFriendManagerId()).isEqualTo(friend1.getId());
        assertThat(dto.isStandard()).isTrue();

        standard.setFriendManagerId(friend2.getId());
        friendTeamService.setStandard(userId, standard);

        List<FriendTeamDto> list = friendTeamService.listFavorites(userId, season.getId());
        assertThat(list).extracting(FriendTeamDto::isStandard).containsExactly(false, true);
    }

    @Test
    void setStandard_nonFavorite_throws() {
        Manager owner = createManager("owner");
        Long userId = owner.getUser().getId();
        Manager friend = createManager("friend");
        Manager notFavorite = createManager("notFavorite");
        friendTeamService.addFavorite(userId, request(friend.getId()));

        SetStandardRequest standard = new SetStandardRequest();
        standard.setSeasonId(season.getId());
        standard.setFriendManagerId(notFavorite.getId());

        assertThatThrownBy(() -> friendTeamService.setStandard(userId, standard))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("kein Favorit");
    }

    @Test
    void setStandard_nullManager_clearsStandard() {
        Manager owner = createManager("owner");
        Long userId = owner.getUser().getId();
        Manager friend = createManager("friend");
        friendTeamService.addFavorite(userId, request(friend.getId()));

        SetStandardRequest standard = new SetStandardRequest();
        standard.setSeasonId(season.getId());
        standard.setFriendManagerId(friend.getId());
        friendTeamService.setStandard(userId, standard);

        SetStandardRequest clear = new SetStandardRequest();
        clear.setSeasonId(season.getId());
        clear.setFriendManagerId(null);
        friendTeamService.setStandard(userId, clear);

        assertThat(friendTeamService.listFavorites(userId, season.getId()).get(0).isStandard()).isFalse();
    }

    private AddFavoriteRequest request(Long friendManagerId) {
        AddFavoriteRequest request = new AddFavoriteRequest();
        request.setSeasonId(season.getId());
        request.setFriendManagerId(friendManagerId);
        return request;
    }
}
