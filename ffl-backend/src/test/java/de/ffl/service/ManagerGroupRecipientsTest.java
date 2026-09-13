package de.ffl.service;

import de.ffl.domain.Manager;
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
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class ManagerGroupRecipientsTest extends AbstractSeasonTestBase {

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
    private User otherUser;
    private User adminUser;
    private Manager creatorManager;
    private Manager memberManager;
    private Manager outsiderManager;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String login) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
            login, null, List.of(new SimpleGrantedAuthority("ROLE_NORMAL")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User createUser(String login, UserRole role) {
        User user = User.builder()
            .login(login)
            .password("$2a$10$test")
            .email(login + "@test.de")
            .firstName(login)
            .lastName("Test")
            .role(role)
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

    private Long createGroupViaService(String name, List<Long> managerIds, List<Long> recipientIds) {
        CreateManagerGroupDto dto = new CreateManagerGroupDto();
        dto.setName(name);
        dto.setDescription("Testbeschreibung");
        dto.setSeasonId(season.getId());
        dto.setManagerIds(managerIds);
        dto.setRecipientIds(recipientIds);
        return managerGroupService.createGroup(dto).getId();
    }

    private Set<Long> recipientIds(Long groupId) {
        return managerGroupRepository.findById(groupId).orElseThrow()
            .getRecipients().stream().map(Manager::getId).collect(Collectors.toSet());
    }

    private void setupFixture() {
        creatorUser = createUser("creator", UserRole.NORMAL);
        otherUser = createUser("other", UserRole.NORMAL);
        adminUser = createUser("admin", UserRole.ADMIN);
        creatorManager = createManager(creatorUser, season);
        memberManager = createManager(otherUser, season);
        outsiderManager = createManager(createUser("outsider", UserRole.NORMAL), season);
    }

    @Test
    void createGroupStartsWithEmptyRecipients() {
        setupFixture();
        authenticateAs("creator");

        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()), null);

        assertTrue(recipientIds(groupId).isEmpty());
    }

    @Test
    void createGroupAppliesRecipientIds() {
        setupFixture();
        authenticateAs("creator");

        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()),
            List.of(creatorManager.getId(), outsiderManager.getId()));

        assertEquals(Set.of(creatorManager.getId(), outsiderManager.getId()), recipientIds(groupId));
    }

    @Test
    void createGroupRejectsRecipientFromOtherSeason() {
        setupFixture();
        authenticateAs("creator");

        Season otherSeason = seasonRepository.save(Season.builder()
            .name("Other Season")
            .budget(30000000)
            .build());
        Manager foreignManager = createManager(otherUser, otherSeason);

        assertThrows(IllegalArgumentException.class, () ->
            createGroupViaService("Gruppe1", List.of(), List.of(foreignManager.getId())));
    }

    @Test
    void updateRecipientsReplacesList() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()), null);

        ManagerGroupDto dto = managerGroupService.updateRecipients(groupId, List.of(creatorManager.getId()));

        assertEquals(Set.of(creatorManager.getId()), recipientIds(groupId));
        assertNotNull(dto.getRecipients());
        assertEquals(1, dto.getRecipients().size());
    }

    @Test
    void updateRecipientsAllowsEmptyList() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()),
            List.of(creatorManager.getId()));

        managerGroupService.updateRecipients(groupId, List.of());

        assertTrue(recipientIds(groupId).isEmpty());
    }

    @Test
    void updateRecipientsRejectsManagerFromOtherSeason() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()), null);

        Season otherSeason = seasonRepository.save(Season.builder()
            .name("Other Season")
            .budget(30000000)
            .build());
        Manager foreignManager = createManager(otherUser, otherSeason);

        assertThrows(IllegalArgumentException.class, () ->
            managerGroupService.updateRecipients(groupId, List.of(foreignManager.getId())));
    }

    @Test
    void updateRecipientsDeniedForNonCreator() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()), null);

        authenticateAs("other");
        ManagerGroupDto dto = managerGroupService.updateRecipients(groupId, List.of(creatorManager.getId()));

        assertNull(dto);
    }

    @Test
    void updateRecipientsAllowedForAdmin() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()), null);

        authenticateAs("admin");
        ManagerGroupDto dto = managerGroupService.updateRecipients(groupId, List.of(creatorManager.getId()));

        assertNotNull(dto);
        assertEquals(Set.of(creatorManager.getId()), recipientIds(groupId));
    }

    @Test
    void dtoHidesRecipientsFromNonCreator() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()),
            List.of(creatorManager.getId()));

        authenticateAs("other");
        List<ManagerGroupDto> groups = managerGroupService.getGroupsForManager(memberManager.getId());
        ManagerGroupDto dto = groups.stream()
            .filter(g -> g.getId().equals(groupId))
            .findFirst().orElseThrow();

        assertNull(dto.getRecipients());
    }

    @Test
    void listDtoShowsRecipientCount() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", List.of(memberManager.getId()),
            List.of(creatorManager.getId(), memberManager.getId()));

        authenticateAs("creator");
        List<de.ffl.dto.ManagerGroupListDto> groups = managerGroupService.getVisibleGroups();
        de.ffl.dto.ManagerGroupListDto listDto = groups.stream()
            .filter(g -> g.getId().equals(groupId))
            .findFirst().orElseThrow();

        assertEquals(2, listDto.getRecipientCount());
    }
}
