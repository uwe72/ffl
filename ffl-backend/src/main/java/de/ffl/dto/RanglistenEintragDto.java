package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RanglistenEintragDto {
    private Long managerId;
    private Integer platz;
    private Integer veraenderung;
    private String teamname;
    private String managername;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private Integer punkteGesamt;
    private Integer punkteSpieltag;
    private Integer kaderwert;
    private Integer abstandZuMir;
    private Boolean istIch;
}
