package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerGroup;
import de.ffl.domain.Season;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.CreateManagerGroupDto;
import de.ffl.dto.ManagerGroupDto;
import de.ffl.repository.ManagerGroupRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ManagerGroupServiceTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private ManagerGroupService managerGroupService;
    @Autowired
    private ManagerGroupRepository managerGroupRepository;
    @Autowired
    private ManagerRepository managerRepository;
    @Autowired
    private UserRepository userRepository;

    private User creatorUser;
    private User referencedUser;
    private User otherUser;
    private Manager referencedManager;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String login) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
            login, null, List.of(new SimpleGrantedAuthority("ROLE_NORMAL")));
        SecurityContextHolder.getContext().setAuthentication(auth);
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

    private Manager createManager(User user, Season season) {
        Manager manager = Manager.builder()
            .user(user)
            .season(season)
            .budget(1000)
            .build();
        return managerRepository.save(manager);
    }

    private Long createGroup(String name, Long seasonId, List<Long> managerIds) {
        CreateManagerGroupDto dto = new CreateManagerGroupDto();
        dto.setName(name);
        dto.setDescription("Testbeschreibung");
        dto.setSeasonId(seasonId);
        dto.setManagerIds(managerIds);
        return managerGroupService.createGroup(dto).getId();
    }

    private void setupFixture() {
        creatorUser = createUser("creator");
        referencedUser = createUser("referenced");
        otherUser = createUser("other");
        referencedManager = createManager(referencedUser, season);

        authenticateAs("creator");
        createGroup("EigeneGruppe", season.getId(), List.of());
        createGroup("ReferenzierteGruppe", season.getId(), List.of(referencedManager.getId()));
        createGroup("Alle", season.getId(), List.of());

        authenticateAs("other");
        createGroup("FremdeGruppe", season.getId(), List.of());
    }

    private Long groupIdByName(String name) {
        return managerGroupRepository.findBySeasonId(season.getId()).stream()
            .filter(g -> name.equals(g.getName()))
            .findFirst()
            .orElseThrow()
            .getId();
    }

    @Test
    void creatorSeesOwnAndReferencedGroups() {
        setupFixture();

        authenticateAs("creator");
        List<de.ffl.dto.ManagerGroupListDto> groups = managerGroupService.getVisibleGroups();
        List<String> names = groups.stream().map(de.ffl.dto.ManagerGroupListDto::getName).toList();
        assertTrue(names.contains("EigeneGruppe"));
        assertTrue(names.contains("ReferenzierteGruppe"));
        assertFalse(names.contains("FremdeGruppe"));
        assertFalse(names.contains("Alle"));
    }

    @Test
    void referencedManagerSeesGroupsTheyAreIn() {
        setupFixture();

        authenticateAs("referenced");
        List<de.ffl.dto.ManagerGroupListDto> groups = managerGroupService.getVisibleGroups();
        List<String> names = groups.stream().map(de.ffl.dto.ManagerGroupListDto::getName).toList();
        assertTrue(names.contains("ReferenzierteGruppe"));
        assertFalse(names.contains("EigeneGruppe"));
        assertFalse(names.contains("FremdeGruppe"));
        assertFalse(names.contains("Alle"));
    }

    @Test
    void unrelatedUserSeesOnlyOwnGroups() {
        setupFixture();

        authenticateAs("other");
        List<de.ffl.dto.ManagerGroupListDto> groups = managerGroupService.getVisibleGroups();
        List<String> names = groups.stream().map(de.ffl.dto.ManagerGroupListDto::getName).toList();
        assertTrue(names.contains("FremdeGruppe"));
        assertFalse(names.contains("EigeneGruppe"));
        assertFalse(names.contains("ReferenzierteGruppe"));
    }

    @Test
    void managerSeesOwnGroupsButOtherUserSeesNone() {
        setupFixture();

        authenticateAs("referenced");
        List<ManagerGroupDto> ownGroups = managerGroupService.getGroupsForManager(referencedManager.getId());
        assertFalse(ownGroups.isEmpty());

        authenticateAs("other");
        List<ManagerGroupDto> foreignGroups = managerGroupService.getGroupsForManager(referencedManager.getId());
        assertTrue(foreignGroups.isEmpty());
    }

    @Test
    void referencedManagerCanViewDetailButNotEdit() {
        setupFixture();
        Long groupId = groupIdByName("ReferenzierteGruppe");

        authenticateAs("referenced");
        ManagerGroupDto detail = managerGroupService.getGroupById(groupId);
        assertNotNull(detail);
        assertFalse(detail.isEditable());

        ManagerGroup updated = new ManagerGroup();
        updated.setName("Geaendert");
        updated.setDescription("Neue Beschreibung");
        assertNull(managerGroupService.updateGroup(groupId, updated));
        assertFalse(managerGroupService.deleteGroup(groupId));
        assertNull(managerGroupService.addManagerToGroup(groupId, referencedManager.getId()));
    }

    @Test
    void unrelatedUserCannotViewDetail() {
        setupFixture();
        Long groupId = groupIdByName("ReferenzierteGruppe");

        authenticateAs("other");
        assertNull(managerGroupService.getGroupById(groupId));
    }

    @Test
    void creatorCanEditOwnGroup() {
        setupFixture();
        Long groupId = groupIdByName("EigeneGruppe");

        authenticateAs("creator");
        ManagerGroup updated = new ManagerGroup();
        updated.setName("EigeneGruppe");
        updated.setDescription("Neue Beschreibung");
        ManagerGroupDto result = managerGroupService.updateGroup(groupId, updated);
        assertNotNull(result);
        assertTrue(result.isEditable());
    }
}
