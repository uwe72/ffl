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
        String inner =
              "<div class=\"content-inner\">"
            + "<p style=\"margin:0;color:#57534e;font-size:14px;line-height:1.6;\">Möchten Sie sich wirklich aus dem FFL-Mailverteiler austragen?</p>"
            + "<div>"
            + "<p style=\"margin:0 0 4px 0;color:#1c1917;font-size:14px;\">E-Mail: <strong>" + escapeHtml(email) + "</strong></p>"
            + "<p style=\"margin:0;color:#78716c;font-size:13px;\">Sie erhalten dann keine weiteren Mails von der FFL.</p>"
            + "</div>"
            + "<div class=\"footer-border\">"
            + "<form method=\"POST\" action=\"/api/public/unsubscribe?id=" + id + "&token=" + escapeHtml(token) + "\">"
            + "<button type=\"submit\" class=\"btn btn-danger\">Ja, austragen</button>"
            + "</form>"
            + "</div>"
            + "</div>";
        return buildPage("Abmeldung", inner);
    }

    private String buildSuccessPage(String email) {
        String inner =
              "<div class=\"content-inner\">"
            + "<div class=\"callout callout-success\">"
            + "<span class=\"icon\">&#10003;</span>"
            + "<div>"
            + "<p style=\"margin:0 0 4px 0;color:#15803d;font-size:15px;font-weight:700;\">Erfolgreich ausgetragen</p>"
            + "<p style=\"margin:0;color:#15803d;font-size:14px;line-height:1.6;\">Die E-Mail-Adresse <strong>" + escapeHtml(email) + "</strong> erhält keine weiteren Mails von der FFL.</p>"
            + "</div>"
            + "</div>"
            + "</div>";
        return buildPage("Abmeldung", inner);
    }

    private String buildErrorPage(String message) {
        String inner =
              "<div class=\"content-inner\">"
            + "<div class=\"callout callout-danger\">"
            + "<span class=\"icon\">!</span>"
            + "<p style=\"margin:0;color:#b91c1c;font-size:14px;line-height:1.6;\">" + escapeHtml(message) + "</p>"
            + "</div>"
            + "</div>";
        return buildPage("Abmeldung", inner);
    }

    private String buildPage(String title, String innerContent) {
        return "<!DOCTYPE html><html lang=\"de\"><head>"
            + "<meta charset=\"UTF-8\">"
            + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<meta name=\"color-scheme\" content=\"light\">"
            + "<title>FFL - " + escapeHtml(title) + "</title>"
            + "<style>"
            + "*,*::before,*::after{box-sizing:border-box;}"
            + "html,body{margin:0;padding:0;}"
            + "body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
            + "color:#1c1917;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}"
            + ".page{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;"
            + "padding:48px 16px;overflow:hidden;background-color:#e7e5e4;}"
            + ".bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}"
            + ".card{position:relative;background:rgba(255,255,255,0.7);"
            + "backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);"
            + "border:1px solid #d6d3d1;border-radius:6px;"
            + "width:100%;max-width:440px;max-height:90vh;"
            + "display:flex;flex-direction:column;"
            + "box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);"
            + "animation:ffl-enter 0.28s cubic-bezier(0.16,1,0.3,1) both;}"
            + ".header{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:32px 24px 8px;}"
            + ".header h2{margin:0;font-size:24px;font-weight:700;color:#1c1917;line-height:1.2;}"
            + ".header p{margin:0;font-size:14px;color:#57534e;}"
            + ".content{flex:1;overflow-y:auto;padding:0 24px 24px;}"
            + ".content-inner{margin-top:8px;display:flex;flex-direction:column;gap:16px;}"
            + ".callout{display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:4px;}"
            + ".callout .icon{display:inline-flex;align-items:center;justify-content:center;"
            + "width:20px;height:20px;flex-shrink:0;font-size:14px;font-weight:700;margin-top:1px;}"
            + ".callout-success{background:#e2f2ea;border:1px solid rgba(21,128,61,0.3);}"
            + ".callout-success .icon{color:#15803d;}"
            + ".callout-danger{background:#fbe6e4;border:1px solid rgba(185,28,28,0.3);}"
            + ".callout-danger .icon{color:#b91c1c;}"
            + ".footer-border{border-top:1px solid #d6d3d1;padding-top:16px;display:flex;justify-content:flex-end;}"
            + ".btn{border:none;border-radius:4px;padding:10px 20px;font-size:14px;font-weight:600;"
            + "cursor:pointer;font-family:inherit;}"
            + ".btn-danger{background:#b91c1c;color:#ffffff;}"
            + ".btn-danger:hover{background:#991b1b;}"
            + "@keyframes ffl-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}"
            + "@media (prefers-reduced-motion:reduce){.card{animation:none;}}"
            + "</style>"
            + "</head><body>"
            + "<div class=\"page\">"
            + "<img class=\"bg-img\" src=\"/background2627.png\" alt=\"\" aria-hidden=\"true\">"
            + "<div class=\"card\">"
            + "<div class=\"header\">"
            + "<h2>" + escapeHtml(title) + "</h2>"
            + "<p>Fantasy Football League</p>"
            + "</div>"
            + "<div class=\"content\">"
            + innerContent
            + "</div>"
            + "</div>"
            + "</div>"
            + "</body></html>";
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
