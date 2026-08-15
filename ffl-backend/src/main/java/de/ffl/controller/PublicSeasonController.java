package de.ffl.controller;

import de.ffl.domain.SystemConfig;
import de.ffl.dto.InvitationPreviewDto;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PublicSeasonInfoDto;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.service.InvitationMailService;
import de.ffl.service.PlayerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicSeasonController {

    private final SeasonRepository seasonRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final PlayerService playerService;
    private final InvitationMailService invitationMailService;

    public PublicSeasonController(SeasonRepository seasonRepository,
                                  SystemConfigRepository systemConfigRepository,
                                  PlayerService playerService,
                                  InvitationMailService invitationMailService) {
        this.seasonRepository = seasonRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.playerService = playerService;
        this.invitationMailService = invitationMailService;
    }

    @GetMapping("/season-info")
    public ResponseEntity<PublicSeasonInfoDto> getPublicSeasonInfo() {
        return seasonRepository.findAll().stream()
            .findFirst()
            .map(season -> ResponseEntity.ok(PublicSeasonInfoDto.fromEntity(season)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/invitation-preview")
    public ResponseEntity<InvitationPreviewDto> getInvitationPreview() {
        return seasonRepository.findAll().stream()
            .findFirst()
            .map(season -> {
                String webUrl = systemConfigRepository.findFirstByOrderByIdAsc()
                    .map(SystemConfig::getWebUrl)
                    .orElse(null);
                return ResponseEntity.ok(invitationMailService.buildPreviewDto(season, webUrl));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/players/season/{seasonId}")
    public ResponseEntity<List<PlayerDto>> getPublicPlayersBySeason(@PathVariable Long seasonId) {
        return seasonRepository.findById(seasonId)
            .filter(season -> season.getSeasonState() == SeasonState.BEFORE_SEASON)
            .map(season -> ResponseEntity.ok(playerService.findPublicBySeasonId(seasonId)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }
}
