package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AufstellungDto {
    private String phase;
    private Integer spieltag;
    private String teamname;
    private Integer punkteGesamt;
    private Integer punkteSpieltag;
    private Integer kaderwert;
    private Integer budget;
    private List<SpielerAufstellungDto> spieler;
}
