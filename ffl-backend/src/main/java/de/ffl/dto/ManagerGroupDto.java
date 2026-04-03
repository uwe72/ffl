package de.ffl.dto;

import de.ffl.domain.ManagerGroup;
import de.ffl.domain.Manager;
import java.util.List;
import java.util.stream.Collectors;

public class ManagerGroupDto {
    private Long id;
    private String name;
    private String description;
    private Long seasonId;
    private List<ManagerInGroupDto> managers;

    public static ManagerGroupDto fromEntity(ManagerGroup group) {
        ManagerGroupDto dto = new ManagerGroupDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        if (group.getSeason() != null) {
            dto.setSeasonId(group.getSeason().getId());
        }
        if (group.getManagers() != null) {
            dto.setManagers(group.getManagers().stream()
                .map(ManagerInGroupDto::fromEntity)
                .collect(Collectors.toList()));
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getSeasonId() { return seasonId; }
    public void setSeasonId(Long seasonId) { this.seasonId = seasonId; }
    public List<ManagerInGroupDto> getManagers() { return managers; }
    public void setManagers(List<ManagerInGroupDto> managers) { this.managers = managers; }

    public static class ManagerInGroupDto {
        private Long id;
        private String name;
        private String shortName;
        private String firstName;
        private String lastName;
        private Integer pointsTotal;
        private Integer pointsLastRound;
        private Integer positionTotal;
        private Integer positionLastRound;

        public static ManagerInGroupDto fromEntity(Manager manager) {
            ManagerInGroupDto dto = new ManagerInGroupDto();
            dto.setId(manager.getId());
            dto.setName(manager.getName());
            dto.setShortName(manager.getShortName());
            if (manager.getUser() != null) {
                dto.setFirstName(manager.getUser().getFirstName());
                dto.setLastName(manager.getUser().getLastName());
            }
            return dto;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getShortName() { return shortName; }
        public void setShortName(String shortName) { this.shortName = shortName; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public Integer getPointsTotal() { return pointsTotal; }
        public void setPointsTotal(Integer pointsTotal) { this.pointsTotal = pointsTotal; }
        public Integer getPointsLastRound() { return pointsLastRound; }
        public void setPointsLastRound(Integer pointsLastRound) { this.pointsLastRound = pointsLastRound; }
        public Integer getPositionTotal() { return positionTotal; }
        public void setPositionTotal(Integer positionTotal) { this.positionTotal = positionTotal; }
        public Integer getPositionLastRound() { return positionLastRound; }
        public void setPositionLastRound(Integer positionLastRound) { this.positionLastRound = positionLastRound; }
    }
}
