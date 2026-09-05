package de.ffl.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SurveyReopenRequest {
    private LocalDateTime deadline;
}
