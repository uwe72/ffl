package de.ffl.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;

import java.time.LocalDate;

public class PublicSeasonInfoDto {
    private Long id;
    private String name;
    private Integer budget;
    private SeasonState seasonState;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate finalRegistrationDate;

    public static PublicSeasonInfoDto fromEntity(Season season) {
        PublicSeasonInfoDto dto = new PublicSeasonInfoDto();
        dto.setId(season.getId());
        dto.setName(season.getName());
        dto.setBudget(season.getBudget());
        dto.setSeasonState(season.getSeasonState());
        dto.setFinalRegistrationDate(season.getFinalRegistrationDate());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getBudget() { return budget; }
    public void setBudget(Integer budget) { this.budget = budget; }
    public SeasonState getSeasonState() { return seasonState; }
    public void setSeasonState(SeasonState seasonState) { this.seasonState = seasonState; }
    public LocalDate getFinalRegistrationDate() { return finalRegistrationDate; }
    public void setFinalRegistrationDate(LocalDate finalRegistrationDate) { this.finalRegistrationDate = finalRegistrationDate; }
}
