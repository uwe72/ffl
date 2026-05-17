package de.ffl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateManagerGroupDto {
    
    @NotBlank(message = "Name ist erforderlich")
    private String name;
    
    @NotBlank(message = "Beschreibung ist erforderlich")
    private String description;
    
    @NotNull(message = "Season ist erforderlich")
    private Long seasonId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getSeasonId() {
        return seasonId;
    }

    public void setSeasonId(Long seasonId) {
        this.seasonId = seasonId;
    }
}
