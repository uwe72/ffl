package de.ffl.dto;

import de.ffl.domain.Player;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerSearchDto {
    private Long id;
    private String nameKicker;
    private String nameKickerAlt1;
    private String nameKickerAlt2;
    private String nameKickerAlt3;
    private String firstName;
    private String lastName;
    private String position;
    private List<TeamInfo> teams;

    public static PlayerSearchDto fromEntity(Player player) {
        return PlayerSearchDto.builder()
            .id(player.getId())
            .nameKicker(player.getNameKicker())
            .nameKickerAlt1(player.getNameKickerAlt1())
            .nameKickerAlt2(player.getNameKickerAlt2())
            .nameKickerAlt3(player.getNameKickerAlt3())
            .firstName(player.getFirstName())
            .lastName(player.getLastName())
            .position(player.getPosition() != null ? player.getPosition().name() : null)
            .teams(player.getTeams() != null ? 
                player.getTeams().stream()
                    .map(t -> new TeamInfo(t.getId(), t.getName()))
                    .collect(Collectors.toList()) : 
                List.of())
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamInfo {
        private Long id;
        private String name;
    }
}
