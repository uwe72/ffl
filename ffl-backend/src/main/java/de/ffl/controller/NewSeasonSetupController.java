package de.ffl.controller;

import de.ffl.migration.NewSeasonSetupRequest;
import de.ffl.migration.NewSeasonSetupService;
import de.ffl.migration.SetupPreviewDto;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/seasons/setup")
@PreAuthorize("hasRole('ADMIN')")
public class NewSeasonSetupController {

    private final NewSeasonSetupService setupService;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public NewSeasonSetupController(NewSeasonSetupService setupService) {
        this.setupService = setupService;
    }

    @PostMapping("/preview")
    public SetupPreviewDto preview(@RequestBody NewSeasonSetupRequest request) {
        return setupService.preview(request.csvUrl());
    }

    @GetMapping(value = "/stream-sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestParam String csvUrl,
                             @RequestParam String seasonName) {
        SseEmitter emitter = new SseEmitter(300000L);
        executor.execute(() -> {
            try {
                setupService.setup(csvUrl, seasonName, message -> {
                    try {
                        emitter.send(SseEmitter.event().data(message));
                    } catch (IOException e) {
                        throw new RuntimeException("SSE-Send fehlgeschlagen", e);
                    }
                });
                emitter.send(SseEmitter.event().name("complete").data("Setup abgeschlossen"));
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("FEHLER: " + e.getMessage()));
                } catch (IOException ioException) {
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }
}