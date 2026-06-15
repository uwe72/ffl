package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerGroup;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Season;
import de.ffl.domain.User;
import de.ffl.dto.CreateManagerGroupDto;
import de.ffl.dto.ManagerGroupDto;
import de.ffl.dto.ManagerGroupListDto;
import de.ffl.dto.ManagerGroupRoundStatsDto;
import de.ffl.repository.ManagerGroupRepository;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ManagerGroupService {

    private static final Logger log = LoggerFactory.getLogger(ManagerGroupService.class);

    private final ManagerGroupRepository managerGroupRepository;
    private final ManagerRankRepository managerRankRepository;
    private final ManagerRepository managerRepository;
    private final UserRepository userRepository;
    private final SeasonRepository seasonRepository;

    public ManagerGroupService(ManagerGroupRepository managerGroupRepository, ManagerRankRepository managerRankRepository, ManagerRepository managerRepository, UserRepository userRepository, SeasonRepository seasonRepository) {
        this.managerGroupRepository = managerGroupRepository;
        this.managerRankRepository = managerRankRepository;
        this.managerRepository = managerRepository;
        this.userRepository = userRepository;
        this.seasonRepository = seasonRepository;
    }

    @Transactional(readOnly = true)
    public List<ManagerGroupListDto> getVisibleGroups() {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return Collections.emptyList();
        }

        List<ManagerGroup> groups;
        if (currentUser.getRole().name().equals("ADMIN")) {
            groups = managerGroupRepository.findBySeasonIdFiltered(getCurrentSeasonId());
        } else {
            groups = managerGroupRepository.findByCreatedById(currentUser.getId());
        }

        return groups.stream()
            .map(this::toListDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ManagerGroupDto getGroupById(Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return null;
        }

        Optional<ManagerGroup> groupOpt = managerGroupRepository.findByIdWithManagers(id);
        if (groupOpt.isEmpty()) {
            return null;
        }

        ManagerGroup group = groupOpt.get();
        if (!canAccessGroup(group, currentUser)) {
            return null;
        }

        ManagerGroupDto dto = toDtoWithRankData(group);
        dto.setEditable(canEditGroup(group, currentUser));
        return dto;
    }

    @Transactional
    public ManagerGroupDto createGroup(CreateManagerGroupDto dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new IllegalArgumentException("User not authenticated");
        }

        Season season = seasonRepository.findById(dto.getSeasonId())
            .orElseThrow(() -> new IllegalArgumentException("Season nicht gefunden"));

        ManagerGroup group = new ManagerGroup();
        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        group.setSeason(season);
        group.setCreatedBy(currentUser);
        group.setManagers(new HashSet<>());
        
        if (dto.getEmailTo() != null) {
            group.setEmailTo(ManagerGroup.EmailToOption.valueOf(dto.getEmailTo()));
        } else {
            group.setEmailTo(ManagerGroup.EmailToOption.ALL_MANAGERS);
        }
        
        if (dto.getManagerIds() != null && !dto.getManagerIds().isEmpty()) {
            for (Long managerId : dto.getManagerIds()) {
                managerRepository.findById(managerId).ifPresent(manager -> {
                    if (manager.getSeason().getId().equals(season.getId())) {
                        group.getManagers().add(manager);
                    }
                });
            }
        }

        ManagerGroup saved = managerGroupRepository.save(group);
        ManagerGroupDto resultDto = toDtoWithRankData(saved);
        resultDto.setEditable(true);
        return resultDto;
    }

    @Transactional
    public ManagerGroupDto updateGroup(Long id, ManagerGroup updatedGroup) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return null;
        }

        Optional<ManagerGroup> existingOpt = managerGroupRepository.findById(id);
        if (existingOpt.isEmpty()) {
            return null;
        }

        ManagerGroup existing = existingOpt.get();
        if (!canEditGroup(existing, currentUser)) {
            return null;
        }

        if (updatedGroup.getDescription() == null || updatedGroup.getDescription().trim().isEmpty()) {
            throw new IllegalArgumentException("Beschreibung ist erforderlich");
        }

        existing.setName(updatedGroup.getName());
        existing.setDescription(updatedGroup.getDescription());
        if (updatedGroup.getEmailTo() != null) {
            existing.setEmailTo(updatedGroup.getEmailTo());
        }
        ManagerGroup saved = managerGroupRepository.save(existing);
        ManagerGroupDto dto = toDtoWithRankData(saved);
        dto.setEditable(true);
        return dto;
    }

    @Transactional
    public boolean deleteGroup(Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return false;
        }

        Optional<ManagerGroup> groupOpt = managerGroupRepository.findById(id);
        if (groupOpt.isEmpty()) {
            return false;
        }

        ManagerGroup group = groupOpt.get();
        if (!canEditGroup(group, currentUser)) {
            return false;
        }

        managerGroupRepository.delete(group);
        return true;
    }

    @Transactional
    public ManagerGroupDto addManagerToGroup(Long groupId, Long managerId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return null;
        }

        Optional<ManagerGroup> groupOpt = managerGroupRepository.findByIdWithManagers(groupId);
        if (groupOpt.isEmpty()) {
            return null;
        }

        ManagerGroup group = groupOpt.get();
        if (!canEditGroup(group, currentUser)) {
            return null;
        }

        Optional<Manager> managerOpt = managerRepository.findById(managerId);
        if (managerOpt.isEmpty()) {
            return null;
        }

        Manager manager = managerOpt.get();
        if (!manager.getSeason().getId().equals(group.getSeason().getId())) {
            return null;
        }

        group.getManagers().add(manager);
        ManagerGroup saved = managerGroupRepository.save(group);
        ManagerGroupDto dto = toDtoWithRankData(saved);
        dto.setEditable(true);
        return dto;
    }

    @Transactional
    public ManagerGroupDto removeManagerFromGroup(Long groupId, Long managerId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return null;
        }

        Optional<ManagerGroup> groupOpt = managerGroupRepository.findByIdWithManagers(groupId);
        if (groupOpt.isEmpty()) {
            return null;
        }

        ManagerGroup group = groupOpt.get();
        if (!canEditGroup(group, currentUser)) {
            return null;
        }

        group.getManagers().removeIf(m -> m.getId().equals(managerId));
        ManagerGroup saved = managerGroupRepository.save(group);
        ManagerGroupDto dto = toDtoWithRankData(saved);
        dto.setEditable(true);
        return dto;
    }

    @Transactional
    public ManagerGroupDto changeCreator(Long groupId, Long newCreatorId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return null;
        }

        if (!currentUser.getRole().name().equals("ADMIN")) {
            return null;
        }

        Optional<ManagerGroup> groupOpt = managerGroupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            return null;
        }

        Optional<User> newCreatorOpt = userRepository.findById(newCreatorId);
        if (newCreatorOpt.isEmpty()) {
            return null;
        }

        ManagerGroup group = groupOpt.get();
        group.setCreatedBy(newCreatorOpt.get());
        ManagerGroup saved = managerGroupRepository.save(group);
        ManagerGroupDto dto = toDtoWithRankData(saved);
        dto.setEditable(true);
        return dto;
    }

    @Transactional
    public ManagerGroupDto updateLogo(Long groupId, MultipartFile file) throws IOException {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            log.warn("updateLogo: no current user for groupId={}", groupId);
            return null;
        }

        Optional<ManagerGroup> groupOpt = managerGroupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            log.warn("updateLogo: group not found, groupId={}", groupId);
            return null;
        }

        ManagerGroup group = groupOpt.get();
        Hibernate.initialize(group.getCreatedBy());
        if (!canEditGroup(group, currentUser)) {
            log.warn("updateLogo: user {} cannot edit group {}", currentUser.getLogin(), groupId);
            return null;
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp"))) {
            throw new IllegalArgumentException("Nur JPG, PNG und WebP Bilder sind erlaubt");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new IllegalArgumentException("Bild darf maximal 2 MB groß sein");
        }

        group.setLogo(file.getBytes());
        group.setLogoContentType(contentType);
        ManagerGroup saved = managerGroupRepository.save(group);
        ManagerGroupDto dto = toDtoWithRankData(saved);
        dto.setEditable(true);
        return dto;
    }

    @Transactional
    public ManagerGroupDto removeLogo(Long groupId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            log.warn("removeLogo: no current user for groupId={}", groupId);
            return null;
        }

        Optional<ManagerGroup> groupOpt = managerGroupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            log.warn("removeLogo: group not found, groupId={}", groupId);
            return null;
        }

        ManagerGroup group = groupOpt.get();
        Hibernate.initialize(group.getCreatedBy());
        if (!canEditGroup(group, currentUser)) {
            log.warn("removeLogo: user {} cannot edit group {}", currentUser.getLogin(), groupId);
            return null;
        }

        group.setLogo(null);
        group.setLogoContentType(null);
        ManagerGroup saved = managerGroupRepository.save(group);
        ManagerGroupDto dto = toDtoWithRankData(saved);
        dto.setEditable(true);
        return dto;
    }

    @Transactional(readOnly = true)
    public byte[] getLogo(Long groupId) {
        Optional<ManagerGroup> groupOpt = managerGroupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            return null;
        }
        ManagerGroup group = groupOpt.get();
        if (group.getLogo() == null) {
            return null;
        }
        return group.getLogo();
    }

    @Transactional(readOnly = true)
    public String getLogoContentType(Long groupId) {
        Optional<ManagerGroup> groupOpt = managerGroupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            return null;
        }
        ManagerGroup group = groupOpt.get();
        if (group.getLogoContentType() == null) {
            return null;
        }
        return group.getLogoContentType();
    }

    @Transactional(readOnly = true)
    public List<ManagerGroupDto> getGroupsForManager(Long managerId) {
        List<ManagerGroup> groups = managerGroupRepository.findByManagerIdWithManagers(managerId);
        
        return groups.stream()
            .map(this::toDtoWithRankData)
            .collect(Collectors.toList());
    }

    private boolean canAccessGroup(ManagerGroup group, User user) {
        if (user.getRole().name().equals("ADMIN")) {
            return true;
        }
        return group.getCreatedBy() != null && group.getCreatedBy().getId().equals(user.getId());
    }

    private boolean canEditGroup(ManagerGroup group, User user) {
        if (user.getRole().name().equals("ADMIN")) {
            return true;
        }
        return group.getCreatedBy() != null && group.getCreatedBy().getId().equals(user.getId());
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        String login = auth.getName();
        return userRepository.findByLogin(login).orElse(null);
    }

    private Long getCurrentSeasonId() {
        return 1L;
    }

    private ManagerGroupListDto toListDto(ManagerGroup group) {
        ManagerGroupListDto dto = new ManagerGroupListDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        if (group.getSeason() != null) {
            dto.setSeasonId(group.getSeason().getId());
        }
        dto.setManagerCount(group.getManagers() != null ? group.getManagers().size() : 0);
        if (group.getCreatedBy() != null) {
            dto.setCreatedById(group.getCreatedBy().getId());
            dto.setCreatedByLogin(group.getCreatedBy().getLogin());
            dto.setCreatedByFirstName(group.getCreatedBy().getFirstName());
            dto.setCreatedByLastName(group.getCreatedBy().getLastName());
        }
        return dto;
    }

    private ManagerGroupDto toDtoWithRankData(ManagerGroup group) {
        ManagerGroupDto dto = new ManagerGroupDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        
        Hibernate.initialize(group.getSeason());
        if (group.getSeason() != null) {
            dto.setSeasonId(group.getSeason().getId());
        }
        
        Hibernate.initialize(group.getCreatedBy());
        if (group.getCreatedBy() != null) {
            dto.setCreatedById(group.getCreatedBy().getId());
            dto.setCreatedByLogin(group.getCreatedBy().getLogin());
            dto.setCreatedByFirstName(group.getCreatedBy().getFirstName());
            dto.setCreatedByLastName(group.getCreatedBy().getLastName());
        }
        if (group.getEmailTo() != null) {
            dto.setEmailTo(group.getEmailTo().name());
        }
        dto.setHasLogo(group.getLogo() != null && group.getLogo().length > 0);
        
        Hibernate.initialize(group.getManagers());
        
        List<ManagerGroupDto.ManagerInGroupDto> managerDtos = new ArrayList<>();
        if (group.getManagers() != null && !group.getManagers().isEmpty()) {
            Map<Long, ManagerRank> latestRanks = getLatestRanksForManagers(group.getManagers());
            
            managerDtos = group.getManagers().stream()
                .map(m -> {
                    Hibernate.initialize(m.getUser());
                    ManagerGroupDto.ManagerInGroupDto mDto = ManagerGroupDto.ManagerInGroupDto.fromEntity(m);
                    ManagerRank rank = latestRanks.get(m.getId());
                    if (rank != null) {
                        mDto.setPointsTotal(rank.getPointsTotal());
                        mDto.setPointsLastRound(rank.getPointsRound());
                        mDto.setPositionTotal(rank.getPositionTotal());
                        mDto.setPositionLastRound(rank.getPositionRound());
                    }
                    return mDto;
                })
                .sorted(Comparator.comparing(ManagerGroupDto.ManagerInGroupDto::getPositionTotal, 
                    Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
        }
        dto.setManagers(managerDtos);
        
        return dto;
    }

    private Map<Long, ManagerRank> getLatestRanksForManagers(Set<Manager> managers) {
        Map<Long, ManagerRank> result = new HashMap<>();
        
        Integer currentMatchday = null;
        for (Manager manager : managers) {
            if (manager.getSeason() != null && manager.getSeason().getCurrentMatchday() != null) {
                currentMatchday = manager.getSeason().getCurrentMatchday();
                break;
            }
        }
        
        if (currentMatchday == null) {
            return result;
        }
        
        List<Long> managerIds = managers.stream().map(Manager::getId).collect(Collectors.toList());
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdInAndRoundNumber(managerIds, currentMatchday);
        
        for (ManagerRank rank : ranks) {
            result.put(rank.getManager().getId(), rank);
        }
        
        return result;
    }

    @Transactional(readOnly = true)
    public List<ManagerGroupRoundStatsDto> getMyGroupsWithStats() {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return Collections.emptyList();
        }

        Manager currentManager = managerRepository.findByUserId(currentUser.getId());
        if (currentManager == null) {
            return Collections.emptyList();
        }

        return getGroupsWithStatsByManagerId(currentManager.getId());
    }

    @Transactional(readOnly = true)
    public List<ManagerGroupRoundStatsDto> getGroupsWithStatsByManagerId(Long managerId) {
        if (managerId == null) {
            return Collections.emptyList();
        }

        List<ManagerGroup> groups = managerGroupRepository.findByManagerIdWithManagers(managerId);
        
        return groups.stream()
            .map(group -> convertToRoundStatsDto(group, managerId))
            .collect(Collectors.toList());
    }

    private ManagerGroupRoundStatsDto convertToRoundStatsDto(ManagerGroup group, Long currentManagerId) {
        ManagerGroupRoundStatsDto dto = new ManagerGroupRoundStatsDto();
        dto.setGroupId(group.getId());
        dto.setGroupName(group.getName());
        
        Hibernate.initialize(group.getManagers());
        
        List<ManagerGroupRoundStatsDto.ManagerRoundDataDto> managerDtos = new ArrayList<>();
        if (group.getManagers() != null) {
            for (Manager manager : group.getManagers()) {
                ManagerGroupRoundStatsDto.ManagerRoundDataDto mDto = new ManagerGroupRoundStatsDto.ManagerRoundDataDto();
                mDto.setManagerId(manager.getId());
                mDto.setManagerName(manager.getName());
                mDto.setShortName(manager.getShortName());
                
                if (manager.getUser() != null) {
                    Hibernate.initialize(manager.getUser());
                    mDto.setFirstName(manager.getUser().getFirstName());
                    mDto.setLastName(manager.getUser().getLastName());
                    mDto.setLogin(manager.getUser().getLogin());
                }
                
                mDto.setIsCurrentUser(manager.getId().equals(currentManagerId));
                
                List<ManagerRank> ranks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(manager.getId());
                List<ManagerGroupRoundStatsDto.RoundPointDto> roundData = new ArrayList<>();
                int cumulative = 0;
                for (ManagerRank rank : ranks) {
                    cumulative += rank.getPointsRound();
                    ManagerGroupRoundStatsDto.RoundPointDto rp = new ManagerGroupRoundStatsDto.RoundPointDto();
                    rp.setRound(rank.getRound().getNumber());
                    rp.setPointsCumulative(cumulative);
                    roundData.add(rp);
                }
                mDto.setRoundData(roundData);
                
                managerDtos.add(mDto);
            }
        }
        dto.setManagers(managerDtos);
        
        return dto;
    }
}
