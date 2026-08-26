package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.dto.BestTeamResult;
import de.ffl.dto.DepositDto;
import de.ffl.dto.DepositSyncResult;
import de.ffl.dto.DocumentDto;
import de.ffl.dto.PrizeDistributionLogDto;
import de.ffl.dto.PrizePayoutDto;
import de.ffl.dto.SetSpielleiterRequest;
import de.ffl.dto.UpdateDepositRequest;
import de.ffl.dto.UpdatePayoutRequest;
import de.ffl.repository.SeasonRepository;
import de.ffl.service.BestTeamService;
import de.ffl.service.DepositService;
import de.ffl.service.DocumentService;
import de.ffl.service.PlayerPdfService;
import de.ffl.service.PrizeDistributionMailService;
import de.ffl.service.PrizeDistributionService;
import de.ffl.service.InvitationMailService;
import de.ffl.service.SeasonReportMailService;
import de.ffl.service.SeasonTransparencyMailService;
import de.ffl.service.ReminderMailService;
import de.ffl.service.SeasonService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/seasons")
public class SeasonController {

    private final SeasonRepository seasonRepository;
    private final SeasonService seasonService;
    private final BestTeamService bestTeamService;
    private final PrizeDistributionService prizeDistributionService;
    private final PrizeDistributionMailService prizeDistributionMailService;
    private final InvitationMailService invitationMailService;
    private final ReminderMailService reminderMailService;
    private final SeasonReportMailService seasonReportMailService;
    private final SeasonTransparencyMailService seasonTransparencyMailService;
    private final DocumentService documentService;
    private final PlayerPdfService playerPdfService;
    private final DepositService depositService;

    public SeasonController(SeasonRepository seasonRepository, SeasonService seasonService, BestTeamService bestTeamService, PrizeDistributionService prizeDistributionService, PrizeDistributionMailService prizeDistributionMailService, InvitationMailService invitationMailService, ReminderMailService reminderMailService, SeasonReportMailService seasonReportMailService, SeasonTransparencyMailService seasonTransparencyMailService, DocumentService documentService, PlayerPdfService playerPdfService, DepositService depositService) {
        this.seasonRepository = seasonRepository;
        this.seasonService = seasonService;
        this.bestTeamService = bestTeamService;
        this.prizeDistributionService = prizeDistributionService;
        this.prizeDistributionMailService = prizeDistributionMailService;
        this.invitationMailService = invitationMailService;
        this.reminderMailService = reminderMailService;
        this.seasonReportMailService = seasonReportMailService;
        this.seasonTransparencyMailService = seasonTransparencyMailService;
        this.documentService = documentService;
        this.playerPdfService = playerPdfService;
        this.depositService = depositService;
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

    @GetMapping("/{id}/best-team")
    public ResponseEntity<BestTeamResult> getBestTeam(@PathVariable Long id) {
        BestTeamResult result = bestTeamService.getBestTeam(id);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
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

    @GetMapping("/{id}/deposits")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DepositDto>> getDeposits(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        List<DepositDto> deposits = depositService.getDeposits(id);
        return ResponseEntity.ok(deposits);
    }

    @PutMapping("/{id}/deposits/{managerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepositDto> updateDeposit(
            @PathVariable Long id,
            @PathVariable Long managerId,
            @RequestBody UpdateDepositRequest request) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            DepositDto updated = depositService.updateDeposit(id, managerId, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/deposits/sync")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepositSyncResult> syncDeposits(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            DepositSyncResult result = depositService.syncDeposits(id);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/managers/{managerId}/spielleiter")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepositDto> setSpielleiter(
            @PathVariable Long id,
            @PathVariable Long managerId,
            @RequestBody SetSpielleiterRequest request) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        if (request.getSpielleiter() == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            DepositDto updated = depositService.setSpielleiter(id, managerId, request.getSpielleiter());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/report-mail")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendSeasonReport(@PathVariable Long id) {        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            seasonReportMailService.sendSeasonReport(id);
            return ResponseEntity.ok(new MessageResponse("Saison-Report wurde erfolgreich versendet."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/{id}/invitation-mail/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendInvitationTestMail(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            invitationMailService.sendTestMail(id);
            return ResponseEntity.ok(new MessageResponse("Test-Einladungsmail wurde an die Admin-Adresse versendet."));
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

    @PostMapping("/{id}/reminder-mail/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendReminderTestMail(@PathVariable Long id,
                                                  @RequestParam(defaultValue = "erinnerung") String variant) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        boolean registered = "danke".equalsIgnoreCase(variant);
        try {
            reminderMailService.sendTestMail(id, registered);
            return ResponseEntity.ok(new MessageResponse("Test-Erinnerungsmail wurde an die Admin-Adresse versendet."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/{id}/reminder-mail/registered-emails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getReminderRegisteredEmails(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(reminderMailService.getRegisteredEmails(id));
    }

    @GetMapping(value = "/{id}/reminder-mail/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamReminderMail(
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
        return reminderMailService.streamReminderMail(id, emailIds, testMode);
    }

    @PostMapping("/{id}/transparency-mail/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendTransparencyTestMail(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            seasonTransparencyMailService.sendTestMail(id);
            return ResponseEntity.ok(new MessageResponse("Test-Transparenz-Report wurde an die Admin-Adresse versendet."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/{id}/transparency-mail/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getTransparencyMailPreview(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            String html = seasonTransparencyMailService.generatePreviewHtml(id);
            return ResponseEntity.ok(new MailPreviewResponse(html));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping(value = "/{id}/transparency-mail/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamTransparencyMail(
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
        return seasonTransparencyMailService.streamTransparencyMail(id, managerIds, testMode);
    }

    @PostMapping("/{id}/players-pdf")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generatePlayersPdf(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] pdf = playerPdfService.generatePlayersPdf(id);
            String filename = playerPdfService.buildFilename(id);
            DocumentDto created = documentService.storeGenerated(pdf, filename, "application/pdf", getCurrentLogin());
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().body(new ErrorResponse(e.getMessage()));
        }
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

    private String getCurrentLogin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return "unknown";
        }
        return auth.getName();
    }
}