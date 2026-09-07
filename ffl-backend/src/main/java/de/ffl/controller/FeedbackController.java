package de.ffl.controller;

import de.ffl.dto.FeedbackRequest;
import de.ffl.service.FeedbackService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private static final Logger log = LoggerFactory.getLogger(FeedbackController.class);

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@Valid @RequestBody FeedbackRequest request,
                                    HttpServletRequest httpRequest) {
        try {
            feedbackService.submit(request, resolveClientIp(httpRequest));
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (FeedbackService.RateLimitExceededException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "Zu viele Anfragen, bitte später erneut versuchen."));
        } catch (IllegalStateException e) {
            log.error("Feedback-Versand wegen Konfigurationsfehler nicht moeglich", e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Feedback kann derzeit nicht verarbeitet werden. Bitte später erneut versuchen."));
        } catch (RuntimeException e) {
            log.error("Unerwarteter Fehler beim Feedback-Versand", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Feedback konnte nicht versendet werden. Bitte später erneut versuchen."));
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return request.getRemoteAddr();
    }
}
