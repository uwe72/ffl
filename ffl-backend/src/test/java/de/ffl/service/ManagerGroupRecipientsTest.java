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

import java.util.HashSet;
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

    private Long createGroupViaService(String name, String emailTo, List<Long> managerIds, List<Long> recipientIds) {
        CreateManagerGroupDto dto = new CreateManagerGroupDto();
        dto.setName(name);
        dto.setDescription("Testbeschreibung");
        dto.setSeasonId(season.getId());
        dto.setEmailTo(emailTo);
        dto.setManagerIds(managerIds);
        dto.setRecipientIds(recipientIds);
        return managerGroupService.createGroup(dto).getId();
    }

    private Long createRawGroup(String name, ManagerGroup.EmailToOption emailTo, Set<Manager> members) {
        ManagerGroup group = ManagerGroup.builder()
            .name(name)
            .description("Testbeschreibung")
            .season(season)
            .createdBy(creatorUser)
            .emailTo(emailTo)
            .managers(members != null ? new HashSet<>(members) : new HashSet<>())
            .recipients(new HashSet<>())
            .recipientsInitialized(false)
            .build();
        return managerGroupRepository.save(group).getId();
    }

    private Set<Long> recipientIds(Long groupId) {
        ManagerGroup group = managerGroupRepository.findById(groupId).orElseThrow();
        return group.getRecipients().stream().map(Manager::getId).collect(Collectors.toSet());
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

        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()), null);

        assertTrue(recipientIds(groupId).isEmpty());
    }

    @Test
    void createGroupAppliesRecipientIds() {
        setupFixture();
        authenticateAs("creator");

        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()),
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
            createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(), List.of(foreignManager.getId())));
    }

    @Test
    void updateRecipientsReplacesList() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()), null);

        ManagerGroupDto dto = managerGroupService.updateRecipients(groupId, List.of(creatorManager.getId()));

        assertEquals(Set.of(creatorManager.getId()), recipientIds(groupId));
        assertNotNull(dto.getRecipients());
        assertEquals(1, dto.getRecipients().size());
    }

    @Test
    void updateRecipientsAllowsEmptyList() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()),
            List.of(creatorManager.getId()));

        managerGroupService.updateRecipients(groupId, List.of());

        assertTrue(recipientIds(groupId).isEmpty());
    }

    @Test
    void updateRecipientsRejectsManagerFromOtherSeason() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()), null);

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
        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()), null);

        authenticateAs("other");
        ManagerGroupDto dto = managerGroupService.updateRecipients(groupId, List.of(creatorManager.getId()));

        assertNull(dto);
    }

    @Test
    void updateRecipientsAllowedForAdmin() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()), null);

        authenticateAs("admin");
        ManagerGroupDto dto = managerGroupService.updateRecipients(groupId, List.of(creatorManager.getId()));

        assertNotNull(dto);
        assertEquals(Set.of(creatorManager.getId()), recipientIds(groupId));
    }

    @Test
    void dtoHidesRecipientsFromNonCreator() {
        setupFixture();
        authenticateAs("creator");
        Long groupId = createGroupViaService("Gruppe1", "ALL_MANAGERS", List.of(memberManager.getId()),
            List.of(creatorManager.getId()));

        authenticateAs("other");
        List<ManagerGroupDto> groups = managerGroupService.getGroupsForManager(memberManager.getId());
        ManagerGroupDto dto = groups.stream()
            .filter(g -> g.getId().equals(groupId))
            .findFirst().orElseThrow();

        assertNull(dto.getRecipients());
    }

    @Test
    void backfillAllManagersIncludesMembersAndCreatorManager() {
        setupFixture();
        Long groupId = createRawGroup("BackfillAlle", ManagerGroup.EmailToOption.ALL_MANAGERS,
            Set.of(memberManager));

        managerGroupService.backfillRecipients();

        assertEquals(Set.of(memberManager.getId(), creatorManager.getId()), recipientIds(groupId));
    }

    @Test
    void backfillCreatorOnlyOnlyCreatorManager() {
        setupFixture();
        Long groupId = createRawGroup("BackfillCreator", ManagerGroup.EmailToOption.CREATOR_ONLY,
            Set.of(memberManager));

        managerGroupService.backfillRecipients();

        assertEquals(Set.of(creatorManager.getId()), recipientIds(groupId));
    }

    @Test
    void backfillSkipsInitializedGroups() {
        setupFixture();
        Long groupId = createRawGroup("BackfillSkip", ManagerGroup.EmailToOption.ALL_MANAGERS,
            Set.of(memberManager));
        ManagerGroup group = managerGroupRepository.findById(groupId).orElseThrow();
        group.setRecipientsInitialized(true);
        managerGroupRepository.save(group);

        managerGroupService.backfillRecipients();

        assertTrue(recipientIds(groupId).isEmpty());
    }

    @Test
    void backfillRunsOnlyOnce() {
        setupFixture();
        Long groupId = createRawGroup("BackfillOnce", ManagerGroup.EmailToOption.ALL_MANAGERS,
            Set.of(memberManager));

        managerGroupService.backfillRecipients();
        ManagerGroup group = managerGroupRepository.findById(groupId).orElseThrow();
        group.getRecipients().clear();
        managerGroupRepository.save(group);

        managerGroupService.backfillRecipients();

        assertTrue(recipientIds(groupId).isEmpty());
    }

    @Test
    void backfillHandlesCreatorWithoutManager() {
        setupFixture();
        User creatorWithoutManager = createUser("noManagerCreator", UserRole.NORMAL);
        ManagerGroup group = ManagerGroup.builder()
            .name("BackfillNoCreatorManager")
            .description("Testbeschreibung")
            .season(season)
            .createdBy(creatorWithoutManager)
            .emailTo(ManagerGroup.EmailToOption.CREATOR_ONLY)
            .managers(new HashSet<>(Set.of(memberManager)))
            .recipients(new HashSet<>())
            .recipientsInitialized(false)
            .build();
        Long groupId = managerGroupRepository.save(group).getId();

        managerGroupService.backfillRecipients();

        assertTrue(recipientIds(groupId).isEmpty());
    }
}
