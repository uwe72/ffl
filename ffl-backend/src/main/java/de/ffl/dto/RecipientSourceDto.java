package de.ffl.dto;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerGroup;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class RecipientSourceDto {

    private Long groupId;
    private String groupName;
    private List<ManagerGroupDto.ManagerInGroupDto> managers = new ArrayList<>();

    public static RecipientSourceDto fromEntity(ManagerGroup group) {
        RecipientSourceDto dto = new RecipientSourceDto();
        dto.setGroupId(group.getId());
        dto.setGroupName(group.getName());
        if (group.getManagers() != null) {
            List<ManagerGroupDto.ManagerInGroupDto> managerDtos = new ArrayList<>();
            for (Manager manager : group.getManagers()) {
                managerDtos.add(ManagerGroupDto.ManagerInGroupDto.fromEntity(manager));
            }
            managerDtos.sort(Comparator.comparing(ManagerGroupDto.ManagerInGroupDto::getName,
                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
            dto.setManagers(managerDtos);
        }
        return dto;
    }

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public List<ManagerGroupDto.ManagerInGroupDto> getManagers() { return managers; }
    public void setManagers(List<ManagerGroupDto.ManagerInGroupDto> managers) { this.managers = managers; }
}
