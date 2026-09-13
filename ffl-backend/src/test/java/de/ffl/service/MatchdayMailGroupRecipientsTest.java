package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerGroup;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.ManagerGroupRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchdayMailGroupRecipientsTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private ManagerGroupRepository managerGroupRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private SeasonRepository seasonRepository;

    private ManagerGroup createGroup(String name, Season groupSeason, User creator,
                                     Manager... members) {
        return createGroup(name, groupSeason, creator, Set.of(members), Set.of());
    }

    private ManagerGroup createGroup(String name, Season groupSeason, User creator,
                                     Set<Manager> members, Set<Manager> recipients) {
        ManagerGroup group = ManagerGroup.builder()
            .name(name)
            .description("Testbeschreibung")
            .season(groupSeason)
            .createdBy(creator)
            .managers(members.isEmpty() ? new HashSet<>() : new HashSet<>(members))
            .recipients(recipients.isEmpty() ? new HashSet<>() : new HashSet<>(recipients))
            .build();
        return managerGroupRepository.save(group);
    }

    private List<ManagerGroup> groupsFor(Season mailSeason, Manager recipientManager) {
        return managerGroupRepository.findGroupsForMatchdayMail(
            mailSeason.getId(), recipientManager.getId());
    }

    @Test
    void recipientOnListReceivesGroup() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);

        createGroup("Gruppe", season, creatorUser,
            Set.of(creatorManager, memberManager), Set.of(memberManager));

        assertTrue(groupsFor(season, memberManager).stream()
            .anyMatch(g -> "Gruppe".equals(g.getName())));
    }

    @Test
    void nonRecipientDoesNotReceiveGroup() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        User outsiderUser = createUser("outsider");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);
        Manager outsiderManager = createManager(outsiderUser);

        createGroup("Gruppe", season, creatorUser,
            Set.of(creatorManager, memberManager), Set.of(memberManager));

        assertTrue(groupsFor(season, outsiderManager).stream()
            .noneMatch(g -> "Gruppe".equals(g.getName())));
    }

    @Test
    void creatorWithoutListEntryDoesNotReceiveGroup() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);

        createGroup("Gruppe", season, creatorUser,
            Set.of(memberManager), Set.of(memberManager));

        assertTrue(groupsFor(season, creatorManager).stream()
            .noneMatch(g -> "Gruppe".equals(g.getName())));
    }

    @Test
    void creatorOnListReceivesGroupEvenWithoutMembership() {
        User creatorUser = createUser("creator");
        Manager creatorManager = createManager(creatorUser);

        ManagerGroup group = createGroup("Gruppe", season, creatorUser,
            Set.of(), Set.of(creatorManager));

        assertTrue(groupsFor(season, creatorManager).stream()
            .anyMatch(g -> "Gruppe".equals(g.getName())));
        assertTrue(group.getManagers().isEmpty());
    }

    @Test
    void emptyRecipientsMeansGroupIsInNoMail() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);

        createGroup("Gruppe", season, creatorUser,
            Set.of(creatorManager, memberManager), Set.of());

        assertTrue(groupsFor(season, creatorManager).stream()
            .noneMatch(g -> "Gruppe".equals(g.getName())));
        assertTrue(groupsFor(season, memberManager).stream()
            .noneMatch(g -> "Gruppe".equals(g.getName())));
    }

    @Test
    void groupFromOtherSeasonIsExcluded() {
        User creatorUser = createUser("creator");
        Manager creatorManager = createManager(creatorUser);

        Season oldSeason = seasonRepository.save(Season.builder()
            .name("2024/25")
            .budget(30000000)
            .seasonState(SeasonState.RUNNING_HINRUNDE)
            .startRoundRueckrunde(TRANSFER_ROUND)
            .build());

        createGroup("AlteSaisonGruppe", oldSeason, creatorUser,
            Set.of(creatorManager), Set.of(creatorManager));

        assertTrue(groupsFor(season, creatorManager).stream()
            .noneMatch(g -> "AlteSaisonGruppe".equals(g.getName())));
        assertTrue(groupsFor(oldSeason, creatorManager).stream()
            .anyMatch(g -> "AlteSaisonGruppe".equals(g.getName())));
    }

    private User createUser(String login) {
        User user = User.builder()
            .login(login)
            .password("$2a$10$test")
            .email(login + "@test.de")
            .firstName(login)
            .lastName("Test")
            .role(UserRole.NORMAL)
            .build();
        return userRepository.save(user);
    }

    private Manager createManager(User user) {
        Manager manager = Manager.builder()
            .user(user)
            .season(season)
            .budget(1000)
            .build();
        return managerRepository.save(manager);
    }
}
