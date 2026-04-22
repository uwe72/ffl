package de.ffl.controller;

import de.ffl.dto.SystemConfigDto;
import de.ffl.dto.TestMailResultDto;
import de.ffl.service.MatchdayMailService;
import de.ffl.service.SystemConfigService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

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

    @PostMapping("/test-mail")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TestMailResultDto> sendTestMail(@RequestParam String to) {
        return ResponseEntity.ok(matchdayMailService.sendTestMail(to));
    }

    /**
     * SSE-Stream fuer den Versand der Spieltagsmail. Token wird per Query-Parameter
     * akzeptiert, da EventSource keine Custom-Header unterstuetzt (analog Season).
     */
    @GetMapping(value = "/matchday-mail/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamMatchdayMail(@RequestParam Long seasonId,
                                         @RequestParam Integer roundNumber,
                                         @RequestParam String managerIds,
                                         @RequestParam(required = false) String token,
                                         @RequestParam(required = false) String comment) {
        List<Long> managerIdList = java.util.Arrays.stream(managerIds.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(Long::parseLong)
            .collect(java.util.stream.Collectors.toList());
        return matchdayMailService.streamMatchdayMail(seasonId, roundNumber, managerIdList, comment);
    }
}
