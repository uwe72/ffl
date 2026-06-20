package de.ffl.controller;

import de.ffl.domain.EmailAddress;
import de.ffl.service.UnsubscribeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/public/unsubscribe")
public class UnsubscribeController {

    private final UnsubscribeService unsubscribeService;

    public UnsubscribeController(UnsubscribeService unsubscribeService) {
        this.unsubscribeService = unsubscribeService;
    }

    @GetMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> showConfirmation(@RequestParam Long id, @RequestParam String token) {
        if (!unsubscribeService.validateToken(id, token)) {
            return ResponseEntity.ok(buildErrorPage("Ungültiger oder abgelaufener Link."));
        }

        Optional<EmailAddress> opt = unsubscribeService.findEmailById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(buildErrorPage("Diese E-Mail-Adresse ist bereits ausgetragen."));
        }

        return ResponseEntity.ok(buildConfirmationPage(opt.get().getEmail(), id, token));
    }

    @PostMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> confirmUnsubscribe(@RequestParam Long id, @RequestParam String token) {
        if (!unsubscribeService.validateToken(id, token)) {
            return ResponseEntity.ok(buildErrorPage("Ungültiger oder abgelaufener Link."));
        }

        Optional<EmailAddress> opt = unsubscribeService.findEmailById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(buildSuccessPage("(bereits ausgetragen)"));
        }

        String email = opt.get().getEmail();
        unsubscribeService.unsubscribe(id);
        return ResponseEntity.ok(buildSuccessPage(email));
    }

    private String buildConfirmationPage(String email, Long id, String token) {
        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>FFL - Abmeldung</title></head>"
            + "<body style=\"background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:40px 20px;margin:0;\">"
            + "<div style=\"max-width:500px;margin:0 auto;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">"
            + "<h1 style=\"color:#0a0a0a;font-size:22px;margin:0 0 8px 0;\">FFL - Mailverteiler</h1>"
            + "<p style=\"color:#6b7280;font-size:14px;margin:0 0 24px 0;\">Fantasy Football League</p>"
            + "<p style=\"color:#0a0a0a;font-size:16px;line-height:1.5;margin:0 0 16px 0;\">Möchten Sie sich wirklich aus dem FFL-Mailverteiler austragen?</p>"
            + "<p style=\"color:#0a0a0a;font-size:14px;margin:0 0 24px 0;\">E-Mail: <strong>" + escapeHtml(email) + "</strong></p>"
            + "<p style=\"color:#6b7280;font-size:13px;margin:0 0 24px 0;\">Sie erhalten dann keine weiteren Mails von der FFL.</p>"
            + "<form method=\"POST\" action=\"/api/public/unsubscribe?id=" + id + "&token=" + escapeHtml(token) + "\">"
            + "<button type=\"submit\" style=\"background:#dc2626;color:#ffffff;border:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;\">Ja, austragen</button>"
            + "</form>"
            + "</div></body></html>";
    }

    private String buildSuccessPage(String email) {
        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>FFL - Abmeldung erfolgreich</title></head>"
            + "<body style=\"background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:40px 20px;margin:0;\">"
            + "<div style=\"max-width:500px;margin:0 auto;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">"
            + "<h1 style=\"color:#0a0a0a;font-size:22px;margin:0 0 8px 0;\">FFL - Mailverteiler</h1>"
            + "<p style=\"color:#6b7280;font-size:14px;margin:0 0 24px 0;\">Fantasy Football League</p>"
            + "<div style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 16px 0;\">"
            + "<p style=\"color:#166534;font-size:16px;font-weight:600;margin:0 0 8px 0;\">✓ Erfolgreich ausgetragen</p>"
            + "<p style=\"color:#166534;font-size:14px;margin:0;\">Die E-Mail-Adresse <strong>" + escapeHtml(email) + "</strong> erhält keine weiteren Mails von der FFL.</p>"
            + "</div>"
            + "</div></body></html>";
    }

    private String buildErrorPage(String message) {
        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>FFL - Fehler</title></head>"
            + "<body style=\"background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:40px 20px;margin:0;\">"
            + "<div style=\"max-width:500px;margin:0 auto;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">"
            + "<h1 style=\"color:#0a0a0a;font-size:22px;margin:0 0 8px 0;\">FFL - Mailverteiler</h1>"
            + "<p style=\"color:#6b7280;font-size:14px;margin:0 0 24px 0;\">Fantasy Football League</p>"
            + "<div style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;\">"
            + "<p style=\"color:#991b1b;font-size:15px;margin:0;\">" + escapeHtml(message) + "</p>"
            + "</div>"
            + "</div></body></html>";
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
