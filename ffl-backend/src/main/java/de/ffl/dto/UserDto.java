package de.ffl.dto;

import de.ffl.domain.Manager;
import de.ffl.domain.User;
import java.util.List;
import java.util.stream.Collectors;

public class UserDto {
    private Long id;
    private String login;
    private String email;
    private String firstName;
    private String lastName;
    private String street;
    private String city;
    private String birthday;
    private String role;
    private List<ManagerInfo> managers;
    private String avatarUrl;

    public static UserDto fromEntity(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setLogin(user.getLogin());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setStreet(user.getStreet());
        dto.setCity(user.getCity());
        dto.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        dto.setRole(user.getRole() != null ? user.getRole().name() : null);
        if (user.getAvatar() != null && user.getAvatar().length > 0) {
            dto.setAvatarUrl("/api/users/" + user.getId() + "/avatar");
        }
        return dto;
    }

    public static UserDto fromEntityWithManagers(User user, List<Manager> managers) {
        UserDto dto = fromEntity(user);
        if (managers != null && !managers.isEmpty()) {
            dto.setManagers(managers.stream()
                .map(m -> {
                    ManagerInfo info = new ManagerInfo();
                    info.setId(m.getId());
                    info.setName(m.getName());
                    info.setShortName(m.getShortName());
                    if (m.getSeason() != null) {
                        info.setSeasonId(m.getSeason().getId());
                        info.setSeasonName(m.getSeason().getName());
                    }
                    return info;
                })
                .collect(Collectors.toList()));
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getLogin() { return login; }
    public void setLogin(String login) { this.login = login; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getBirthday() { return birthday; }
    public void setBirthday(String birthday) { this.birthday = birthday; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public List<ManagerInfo> getManagers() { return managers; }
    public void setManagers(List<ManagerInfo> managers) { this.managers = managers; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public static class ManagerInfo {
        private Long id;
        private String name;
        private String shortName;
        private Long seasonId;
        private String seasonName;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getShortName() { return shortName; }
        public void setShortName(String shortName) { this.shortName = shortName; }
        public Long getSeasonId() { return seasonId; }
        public void setSeasonId(Long seasonId) { this.seasonId = seasonId; }
        public String getSeasonName() { return seasonName; }
        public void setSeasonName(String seasonName) { this.seasonName = seasonName; }
    }
}
