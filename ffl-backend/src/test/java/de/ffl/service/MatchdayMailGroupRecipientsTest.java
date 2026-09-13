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
                                     ManagerGroup.EmailToOption emailTo, Manager... members) {
        ManagerGroup group = ManagerGroup.builder()
            .name(name)
            .description("Testbeschreibung")
            .season(groupSeason)
            .createdBy(creator)
            .emailTo(emailTo)
            .managers(new HashSet<>(Set.of(members)))
            .build();
        return managerGroupRepository.save(group);
    }

    private List<ManagerGroup> groupsFor(Season mailSeason, Manager recipientManager, User recipientUser) {
        return managerGroupRepository.findGroupsForMatchdayMail(
            mailSeason.getId(), recipientManager.getId(), recipientUser.getId());
    }

    @Test
    void alleManagers_memberReceivesGroup() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);

        createGroup("AlleGruppe", season, creatorUser, ManagerGroup.EmailToOption.ALL_MANAGERS,
            creatorManager, memberManager);

        assertTrue(groupsFor(season, memberManager, memberUser).stream()
            .anyMatch(g -> "AlleGruppe".equals(g.getName())));
    }

    @Test
    void alleManagers_nonMemberNonCreatorDoesNotReceiveGroup() {
        User creatorUser = createUser("creator");
        User outsiderUser = createUser("outsider");
        Manager creatorManager = createManager(creatorUser);
        Manager outsiderManager = createManager(outsiderUser);

        createGroup("AlleGruppe", season, creatorUser, ManagerGroup.EmailToOption.ALL_MANAGERS,
            creatorManager);

        assertTrue(groupsFor(season, outsiderManager, outsiderUser).stream()
            .noneMatch(g -> "AlleGruppe".equals(g.getName())));
    }

    @Test
    void alleManagers_creatorReceivesGroupEvenWithoutMembership() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);

        createGroup("AlleGruppeOhneErsteller", season, creatorUser, ManagerGroup.EmailToOption.ALL_MANAGERS,
            memberManager);

        assertTrue(groupsFor(season, creatorManager, creatorUser).stream()
            .anyMatch(g -> "AlleGruppeOhneErsteller".equals(g.getName())));
    }

    @Test
    void creatorOnly_creatorMemberReceivesGroup() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);

        createGroup("NurErstellerGruppe", season, creatorUser, ManagerGroup.EmailToOption.CREATOR_ONLY,
            creatorManager, memberManager);

        assertTrue(groupsFor(season, creatorManager, creatorUser).stream()
            .anyMatch(g -> "NurErstellerGruppe".equals(g.getName())));
    }

    @Test
    void creatorOnly_creatorWithoutMembershipReceivesGroup() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);

        ManagerGroup group = createGroup("NurErstellerOhneMitgliedschaft", season, creatorUser,
            ManagerGroup.EmailToOption.CREATOR_ONLY, memberManager);

        assertTrue(groupsFor(season, creatorManager, creatorUser).stream()
            .anyMatch(g -> "NurErstellerOhneMitgliedschaft".equals(g.getName())));
        assertTrue(group.getManagers().stream().noneMatch(m -> m.getId().equals(creatorManager.getId())));
    }

    @Test
    void creatorOnly_memberNonCreatorDoesNotReceiveGroup() {
        User creatorUser = createUser("creator");
        User memberUser = createUser("member");
        User outsiderUser = createUser("outsider");
        Manager creatorManager = createManager(creatorUser);
        Manager memberManager = createManager(memberUser);
        Manager outsiderManager = createManager(outsiderUser);

        createGroup("NurErstellerGruppe", season, creatorUser, ManagerGroup.EmailToOption.CREATOR_ONLY,
            creatorManager, memberManager);

        assertTrue(groupsFor(season, memberManager, memberUser).stream()
            .noneMatch(g -> "NurErstellerGruppe".equals(g.getName())));
        assertTrue(groupsFor(season, outsiderManager, outsiderUser).stream()
            .noneMatch(g -> "NurErstellerGruppe".equals(g.getName())));
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

        createGroup("AlteSaisonGruppe", oldSeason, creatorUser, ManagerGroup.EmailToOption.ALL_MANAGERS,
            creatorManager);
        createGroup("AlteSaisonGruppeCreatorOnly", oldSeason, creatorUser,
            ManagerGroup.EmailToOption.CREATOR_ONLY, creatorManager);

        assertTrue(groupsFor(season, creatorManager, creatorUser).stream()
            .noneMatch(g -> g.getName().startsWith("AlteSaison")));
        assertTrue(groupsFor(oldSeason, creatorManager, creatorUser).stream()
            .anyMatch(g -> "AlteSaisonGruppe".equals(g.getName())));
        assertTrue(groupsFor(oldSeason, creatorManager, creatorUser).stream()
            .anyMatch(g -> "AlteSaisonGruppeCreatorOnly".equals(g.getName())));
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
