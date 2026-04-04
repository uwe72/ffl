package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameImportRequest {
    private Map<String, Long> playerMappings;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreatePlayerRequest {
        private String playerName;
        private Long teamId;
        private String position;
    }
}
