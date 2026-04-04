package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerGroup;
import de.ffl.domain.ManagerRank;
import de.ffl.dto.ManagerGroupDto;
import de.ffl.dto.ManagerGroupDto.ManagerInGroupDto;
import de.ffl.repository.ManagerGroupRepository;
import de.ffl.repository.ManagerRankRepository;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ManagerGroupService {

    private final ManagerGroupRepository managerGroupRepository;
    private final ManagerRankRepository managerRankRepository;

    public ManagerGroupService(ManagerGroupRepository managerGroupRepository, ManagerRankRepository managerRankRepository) {
        this.managerGroupRepository = managerGroupRepository;
        this.managerRankRepository = managerRankRepository;
    }

    @Transactional(readOnly = true)
    public List<ManagerGroupDto> getGroupsForManager(Long managerId) {
        List<ManagerGroup> groups = managerGroupRepository.findByManagerIdWithManagers(managerId);
        
        return groups.stream()
            .map(this::toDtoWithRankData)
            .collect(Collectors.toList());
    }

    private ManagerGroupDto toDtoWithRankData(ManagerGroup group) {
        ManagerGroupDto dto = new ManagerGroupDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        if (group.getSeason() != null) {
            dto.setSeasonId(group.getSeason().getId());
        }
        
        Hibernate.initialize(group.getManagers());
        
        List<ManagerInGroupDto> managerDtos = new ArrayList<>();
        if (group.getManagers() != null && !group.getManagers().isEmpty()) {
            Map<Long, ManagerRank> latestRanks = getLatestRanksForManagers(group.getManagers());
            
            managerDtos = group.getManagers().stream()
                .map(m -> {
                    Hibernate.initialize(m.getUser());
                    ManagerInGroupDto mDto = ManagerInGroupDto.fromEntity(m);
                    ManagerRank rank = latestRanks.get(m.getId());
                    if (rank != null) {
                        mDto.setPointsTotal(rank.getPointsTotal());
                        mDto.setPointsLastRound(rank.getPointsRound());
                        mDto.setPositionTotal(rank.getPositionTotal());
                        mDto.setPositionLastRound(rank.getPositionRound());
                    }
                    return mDto;
                })
                .sorted(Comparator.comparing(ManagerInGroupDto::getPositionTotal, 
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
}
