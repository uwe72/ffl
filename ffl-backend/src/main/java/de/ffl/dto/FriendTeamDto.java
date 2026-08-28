package de.ffl.dto;

import de.ffl.domain.FriendTeam;

public class FriendTeamDto {

    private Long id;
    private Long friendManagerId;
    private String name;
    private String shortName;
    private String firstName;
    private String lastName;
    private String login;
    private String avatarUrl;
    private int position;
    private boolean standard;

    public static FriendTeamDto fromEntity(FriendTeam friendTeam) {
        FriendTeamDto dto = new FriendTeamDto();
        dto.setId(friendTeam.getId());
        dto.setPosition(friendTeam.getPosition());
        dto.setStandard(friendTeam.isStandard());
        if (friendTeam.getFriendManager() != null) {
            dto.setFriendManagerId(friendTeam.getFriendManager().getId());
            dto.setName(friendTeam.getFriendManager().getName());
            dto.setShortName(friendTeam.getFriendManager().getShortName());
            if (friendTeam.getFriendManager().getUser() != null) {
                dto.setFirstName(friendTeam.getFriendManager().getUser().getFirstName());
                dto.setLastName(friendTeam.getFriendManager().getUser().getLastName());
                dto.setLogin(friendTeam.getFriendManager().getUser().getLogin());
                if (friendTeam.getFriendManager().getUser().getAvatar() != null
                    && friendTeam.getFriendManager().getUser().getAvatar().length > 0) {
                    dto.setAvatarUrl("/api/users/" + friendTeam.getFriendManager().getUser().getId() + "/avatar");
                }
            }
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFriendManagerId() { return friendManagerId; }
    public void setFriendManagerId(Long friendManagerId) { this.friendManagerId = friendManagerId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getShortName() { return shortName; }
    public void setShortName(String shortName) { this.shortName = shortName; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getLogin() { return login; }
    public void setLogin(String login) { this.login = login; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public boolean isStandard() { return standard; }
    public void setStandard(boolean standard) { this.standard = standard; }
}
