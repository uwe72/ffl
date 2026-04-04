package de.ffl.dto;

import de.ffl.domain.Game;
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
public class GameDto {
    private Long id;
    private String name;
    private Long roundId;
    private Integer roundNumber;
    private Long seasonId;
    private Long hostId;
    private String hostName;
    private String hostShortName;
    private String hostLogoUrl;
    private Long visitorId;
    private String visitorName;
    private String visitorShortName;
    private String visitorLogoUrl;
    private Integer goalHost;
    private Integer goalVisitor;
    private String formation;
    private String formationExtern;
    private String formationIntern;
    @Builder.Default
    private List<PlayerPointsDto> playersHost = new ArrayList<>();
    @Builder.Default
    private List<PlayerPointsDto> playersVisitor = new ArrayList<>();

    public static GameDto fromEntity(Game game) {
        GameDto dto = GameDto.builder()
            .id(game.getId())
            .name(game.getName())
            .goalHost(game.getGoalHost())
            .goalVisitor(game.getGoalVisitor())
            .formation(game.getFormation())
            .formationExtern(game.getFormationExtern())
            .formationIntern(game.getFormationIntern())
            .build();

        if (game.getRound() != null) {
            dto.setRoundId(game.getRound().getId());
            dto.setRoundNumber(game.getRound().getNumber());
            if (game.getRound().getSeason() != null) {
                dto.setSeasonId(game.getRound().getSeason().getId());
            }
        }

        if (game.getHost() != null) {
            dto.setHostId(game.getHost().getId());
            dto.setHostName(game.getHost().getName());
            dto.setHostShortName(game.getHost().getShortName());
            dto.setHostLogoUrl(game.getHost().getLogoXxlUrl());
        }

        if (game.getVisitor() != null) {
            dto.setVisitorId(game.getVisitor().getId());
            dto.setVisitorName(game.getVisitor().getName());
            dto.setVisitorShortName(game.getVisitor().getShortName());
            dto.setVisitorLogoUrl(game.getVisitor().getLogoXxlUrl());
        }

        return dto;
    }
}