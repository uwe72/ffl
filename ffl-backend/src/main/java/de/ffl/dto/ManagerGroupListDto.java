package de.ffl.dto;

public class ManagerGroupListDto {
    private Long id;
    private String name;
    private String description;
    private Long seasonId;
    private Integer managerCount;
    private Long createdById;
    private String createdByLogin;
    private String createdByFirstName;
    private String createdByLastName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getSeasonId() { return seasonId; }
    public void setSeasonId(Long seasonId) { this.seasonId = seasonId; }
    public Integer getManagerCount() { return managerCount; }
    public void setManagerCount(Integer managerCount) { this.managerCount = managerCount; }
    public Long getCreatedById() { return createdById; }
    public void setCreatedById(Long createdById) { this.createdById = createdById; }
    public String getCreatedByLogin() { return createdByLogin; }
    public void setCreatedByLogin(String createdByLogin) { this.createdByLogin = createdByLogin; }
    public String getCreatedByFirstName() { return createdByFirstName; }
    public void setCreatedByFirstName(String createdByFirstName) { this.createdByFirstName = createdByFirstName; }
    public String getCreatedByLastName() { return createdByLastName; }
    public void setCreatedByLastName(String createdByLastName) { this.createdByLastName = createdByLastName; }
}
