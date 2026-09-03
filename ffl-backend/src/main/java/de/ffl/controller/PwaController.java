package de.ffl.controller;

import de.ffl.domain.User;
import de.ffl.repository.UserRepository;
import de.ffl.service.InstallStatisticsService;
import de.ffl.service.PwaInstallTrackingService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
public class PwaController {

    private final PwaInstallTrackingService pwaInstallTrackingService;
    private final InstallStatisticsService installStatisticsService;
    private final UserRepository userRepository;

    public PwaController(PwaInstallTrackingService pwaInstallTrackingService,
                         InstallStatisticsService installStatisticsService,
                         UserRepository userRepository) {
        this.pwaInstallTrackingService = pwaInstallTrackingService;
        this.installStatisticsService = installStatisticsService;
        this.userRepository = userRepository;
    }

    @PostMapping("/api/pwa/install-click")
    public ResponseEntity<Map<String, String>> trackInstallClick(HttpServletRequest request) {
        String login = getCurrentLogin();
        User user = (login == null || login.isBlank())
                ? null
                : userRepository.findByLoginIgnoreCase(login).orElse(null);
        if (user != null) {
            installStatisticsService.recordClick(user);
        }
        pwaInstallTrackingService.track(
                login,
                resolveClientIp(request),
                request.getHeader("User-Agent"));
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    private String getCurrentLogin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return auth.getName();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return request.getRemoteAddr();
    }

    @GetMapping("/manifest.webmanifest")
    public ResponseEntity<Resource> getManifest() {
        Resource resource = new ClassPathResource("static/manifest.webmanifest");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .contentType(MediaType.valueOf("application/manifest+json"))
                .body(resource);
    }

    @GetMapping("/sw.js")
    public ResponseEntity<Resource> getServiceWorker() {
        Resource resource = new ClassPathResource("static/sw.js");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .contentType(MediaType.valueOf("application/javascript"))
                .body(resource);
    }
}
