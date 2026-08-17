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
public class RanglisteDto {
    private String phase;
    private Integer spieltag;
    private Integer teilnehmer;
    private Integer preisgeldGrenzePlatz;
    private Integer abstandZuPlatzEins;
    private Integer abstandZurPreisgeldGrenze;
    private List<RanglistenEintragDto> eintraege;
    private List<VerteilungEintragDto> verteilung;
    private Integer eigenerWert;
    private Boolean hatOben;
    private Boolean hatUnten;
}
