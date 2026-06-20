package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.dto.PrizeDistributionLogDto;
import de.ffl.dto.PrizePayoutDto;
import de.ffl.dto.UpdatePayoutRequest;
import de.ffl.repository.SeasonRepository;
import de.ffl.service.PrizeDistributionMailService;
import de.ffl.service.PrizeDistributionService;
import de.ffl.service.InvitationMailService;
import de.ffl.service.SeasonReportMailService;
import de.ffl.service.SeasonService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/seasons")
public class SeasonController {

    private final SeasonRepository seasonRepository;
    private final SeasonService seasonService;
    private final PrizeDistributionService prizeDistributionService;
    private final PrizeDistributionMailService prizeDistributionMailService;
    private final InvitationMailService invitationMailService;
    private final SeasonReportMailService seasonReportMailService;

    public SeasonController(SeasonRepository seasonRepository, SeasonService seasonService, PrizeDistributionService prizeDistributionService, PrizeDistributionMailService prizeDistributionMailService, InvitationMailService invitationMailService, SeasonReportMailService seasonReportMailService) {
        this.seasonRepository = seasonRepository;
        this.seasonService = seasonService;
        this.prizeDistributionService = prizeDistributionService;
        this.prizeDistributionMailService = prizeDistributionMailService;
        this.invitationMailService = invitationMailService;
        this.seasonReportMailService = seasonReportMailService;
    }

    @GetMapping
    public List<Season> getAllSeasons() {
        return seasonRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Season> getSeasonById(@PathVariable Long id) {
        return seasonRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/current")
    public ResponseEntity<Season> getCurrentSeason() {
        return seasonRepository.findAll().stream()
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Season createSeason(@RequestBody Season season) {
        return seasonRepository.save(season);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Season> updateSeason(@PathVariable Long id, @RequestBody Season season) {
        return seasonRepository.findById(id)
            .map(existing -> {
                existing.setName(season.getName());
                existing.setBudget(season.getBudget());
                existing.setSeasonState(season.getSeasonState());
                existing.setFinalRegistrationDate(season.getFinalRegistrationDate());
                existing.setSeasonStartDate(season.getSeasonStartDate());
                existing.setSeasonStartTime(season.getSeasonStartTime());
                existing.setStartRoundRueckrunde(season.getStartRoundRueckrunde());
                existing.setSpieleinsatzEuro(season.getSpieleinsatzEuro());
                existing.setServerkostenEuro(season.getServerkostenEuro());
                existing.setAnzahlSpielleiter(season.getAnzahlSpielleiter());
                existing.setGewinnErsterPlatzProzent(season.getGewinnErsterPlatzProzent());
                existing.setGewinnLetzterPlatzEuro(season.getGewinnLetzterPlatzEuro());
                existing.setMailText(season.getMailText());
                existing.setInvitationMailText(season.getInvitationMailText());
                existing.setInvitationMailSubject(season.getInvitationMailSubject());
                existing.setPaypalLink(season.getPaypalLink());
                existing.setBankName(season.getBankName());
                existing.setIban(season.getIban());
                existing.setBic(season.getBic());
                existing.setKontoinhaber(season.getKontoinhaber());
                return ResponseEntity.ok(seasonRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/state")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Season> updateSeasonState(@PathVariable Long id, @RequestBody SeasonStateUpdate request) {
        return seasonRepository.findById(id)
            .map(existing -> {
                existing.setName(request.getName());
                existing.setSeasonState(request.getSeasonState());
                return ResponseEntity.ok(seasonRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/calculate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeasonService.CalculationResult> calculateSeason(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        SeasonService.CalculationResult result = seasonService.calculateSeasonWithLogs(id);
        return ResponseEntity.ok(result);
    }

    @GetMapping(value = "/{id}/calculate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter calculateSeasonStream(@PathVariable Long id) {
        return seasonService.calculateSeasonStream(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSeason(@PathVariable Long id) {
        if (seasonRepository.existsById(id)) {
            seasonRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}/prize-distribution")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PrizePayoutDto>> getPrizeDistribution(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        List<PrizePayoutDto> distribution = prizeDistributionService.getPrizeDistribution(id);
        return ResponseEntity.ok(distribution);
    }

    @PostMapping("/{id}/prize-distribution")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> calculatePrizeDistribution(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            List<PrizePayoutDto> distribution = prizeDistributionService.calculateDistribution(id);
            return ResponseEntity.ok(distribution);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/{id}/prize-distribution/log")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PrizeDistributionLogDto> getPrizeDistributionLog(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        PrizeDistributionLogDto log = prizeDistributionService.getDistributionLog(id);
        if (log == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(log);
    }

    @PutMapping("/{id}/prize-payouts/{managerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PrizePayoutDto> updatePrizePayout(
            @PathVariable Long id,
            @PathVariable Long managerId,
            @RequestBody UpdatePayoutRequest request) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            PrizePayoutDto updated = prizeDistributionService.updatePayout(id, managerId, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/prize-distribution/validation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PrizeDistributionService.MinP1ValidationResult> getMinP1Validation(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        PrizeDistributionService.MinP1ValidationResult result = prizeDistributionService.getMinP1Validation(id);
        return ResponseEntity.ok(result);
    }

    @GetMapping(value = "/{id}/prize-distribution/mail/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamPrizeDistributionMail(
            @PathVariable Long id,
            @RequestParam List<Long> managerIds,
            @RequestParam(required = false, defaultValue = "false") boolean testMode) {
        if (!seasonRepository.existsById(id)) {
            SseEmitter emitter = new SseEmitter();
            try {
                emitter.send(SseEmitter.event().name("error").data("Saison nicht gefunden"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }
        return prizeDistributionMailService.streamPrizeDistributionMail(id, managerIds, testMode);
    }

    @GetMapping("/{id}/prize-distribution/mail/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPrizeDistributionMailPreview(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            String html = prizeDistributionMailService.generatePreviewHtml(id);
            return ResponseEntity.ok(new MailPreviewResponse(html));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/{id}/report-mail")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendSeasonReport(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            seasonReportMailService.sendSeasonReport(id);
            return ResponseEntity.ok(new MessageResponse("Saison-Report wurde erfolgreich versendet."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/{id}/invitation-mail/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getInvitationMailPreview(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            String html = invitationMailService.generatePreviewHtml(id);
            return ResponseEntity.ok(new MailPreviewResponse(html));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping(value = "/{id}/invitation-mail/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamInvitationMail(
            @PathVariable Long id,
            @RequestParam List<Long> emailIds,
            @RequestParam(required = false, defaultValue = "false") boolean testMode) {
        if (!seasonRepository.existsById(id)) {
            SseEmitter emitter = new SseEmitter();
            try {
                emitter.send(SseEmitter.event().name("error").data("Saison nicht gefunden"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }
        return invitationMailService.streamInvitationMail(id, emailIds, testMode);
    }

    public static class MessageResponse {
        private String message;

        public MessageResponse(String message) {
            this.message = message;
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class ErrorResponse {
        private String message;

        public ErrorResponse(String message) {
            this.message = message;
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class MailPreviewResponse {
        private String html;

        public MailPreviewResponse(String html) {
            this.html = html;
        }

        public String getHtml() { return html; }
        public void setHtml(String html) { this.html = html; }
    }

    public static class SeasonStateUpdate {
        private String name;
        private SeasonState seasonState;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public SeasonState getSeasonState() { return seasonState; }
        public void setSeasonState(SeasonState seasonState) { this.seasonState = seasonState; }
    }
}