package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpielerAufstellungDto {
    private Long id;
    private String name;
    private String vereinKuerzel;
    private String position;
    private Boolean joker;
    private Integer punkteGesamt;
    private Integer punkteSpieltag;
    private Integer marktwert;
    private Integer tore;
    private Integer zuNull;
}
