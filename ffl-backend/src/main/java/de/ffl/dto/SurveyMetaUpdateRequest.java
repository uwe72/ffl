package de.ffl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SurveyMetaUpdateRequest {
    @NotBlank
    private String title;

    private String description;

    @NotNull
    private LocalDateTime deadline;
}
