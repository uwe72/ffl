package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissingPlayerInfo {
    private String playerName;
    private String teamName;
    private Long teamId;
    private boolean host;
}
