package de.ffl.controller;

import de.ffl.dto.MatchdayMailRequestDto;
import de.ffl.dto.PaymentCheckRequest;
import de.ffl.dto.SystemConfigDto;
import de.ffl.dto.TestMailResultDto;
import de.ffl.service.MatchdayMailService;
import de.ffl.service.SystemConfigService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/system")
public class SystemConfigController {

    private final SystemConfigService configService;
    private final MatchdayMailService matchdayMailService;

    public SystemConfigController(SystemConfigService configService,
                                  MatchdayMailService matchdayMailService) {
        this.configService = configService;
        this.matchdayMailService = matchdayMailService;
    }

    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemConfigDto> getConfig() {
        return ResponseEntity.ok(configService.getConfig());
    }

    @PutMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemConfigDto> updateConfig(@RequestBody SystemConfigDto updateData) {
        return ResponseEntity.ok(configService.updateConfig(updateData));
    }

    @PutMapping("/config/payment-checks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemConfigDto> updatePaymentChecks(@RequestBody PaymentCheckRequest request) {
        return ResponseEntity.ok(configService.updatePaymentChecks(
            request.getLastPaypalCheck(), request.getLastUeberweisungCheck()));
    }

    @PostMapping("/test-mail")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TestMailResultDto> sendTestMail(@RequestParam String to) {
        return ResponseEntity.ok(matchdayMailService.sendTestMail(to));
    }

    /**
     * SSE-Stream fuer den Versand der Spieltagsmail. Der Kommentar wird als
     * Rich-Text-HTML im JSON-Body uebertragen und im Backend bereinigt.
     */
    @PostMapping(value = "/matchday-mail/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamMatchdayMail(@RequestBody MatchdayMailRequestDto request) {
        return matchdayMailService.streamMatchdayMail(
            request.getSeasonId(),
            request.getRoundNumber(),
            request.getManagerIds(),
            request.getComment(),
            request.isTestMode());
    }
}
