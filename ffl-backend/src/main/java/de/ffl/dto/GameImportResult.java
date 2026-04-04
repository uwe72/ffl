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
public class GameImportResult {
    private boolean success;
    private String errorMessage;
    private List<MissingPlayer> missingPlayers;
    private GameDto game;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MissingPlayer {
        private String playerName;
        private Long teamId;
        private String teamName;
        private boolean isHost;
    }
}
