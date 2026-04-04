package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormationValidationResult {
    private boolean valid;
    @Builder.Default
    private List<String> errors = new ArrayList<>();
    private int hostPlayerCount;
    private int visitorPlayerCount;
    @Builder.Default
    private List<MissingPlayerInfo> missingPlayers = new ArrayList<>();
}
