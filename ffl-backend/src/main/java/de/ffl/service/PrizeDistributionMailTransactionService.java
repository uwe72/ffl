package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.PrizeDistributionLog;
import de.ffl.domain.PrizePayout;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PrizeDistributionLogRepository;
import de.ffl.repository.PrizePayoutRepository;
import de.ffl.repository.SeasonRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class PrizeDistributionMailTransactionService {

    private static final Logger log = LoggerFactory.getLogger(PrizeDistributionMailTransactionService.class);

    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;
    private final PrizePayoutRepository prizePayoutRepository;
    private final PrizeDistributionLogRepository prizeDistributionLogRepository;
    private final PrizeDistributionHtmlBuilder htmlBuilder;

    public PrizeDistributionMailTransactionService(SeasonRepository seasonRepository,
                                                   ManagerRepository managerRepository,
                                                   PrizePayoutRepository prizePayoutRepository,
                                                   PrizeDistributionLogRepository prizeDistributionLogRepository,
                                                   PrizeDistributionHtmlBuilder htmlBuilder) {
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.prizePayoutRepository = prizePayoutRepository;
        this.prizeDistributionLogRepository = prizeDistributionLogRepository;
        this.htmlBuilder = htmlBuilder;
    }

    public void runMailJob(SseEmitter emitter, Long seasonId, List<Long> managerIds,
                           JavaMailSenderImpl mailSender, SystemConfig config, boolean testMode) {
        try {
            send(emitter, "Lade Saisonabschluss-Daten…");

            Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));

            List<PrizePayout> payouts = prizePayoutRepository.findBySeasonIdOrderByPositionAsc(seasonId);
            if (payouts.isEmpty()) {
                send(emitter, "FEHLER: Keine Gewinnverteilung für Saison " + seasonId + " vorhanden");
                emitter.send(SseEmitter.event().name("error").data("Keine Gewinnverteilung vorhanden"));
                emitter.complete();
                return;
            }

            PrizeDistributionLog distributionLog = prizeDistributionLogRepository.findBySeasonId(seasonId)
                .orElseThrow(() -> new RuntimeException("Keine Berechnungsstatistik für Saison " + seasonId + " vorhanden"));

            List<Manager> allManagersInSeason = managerRepository.findBySeasonIdWithPlayers(seasonId);
            Map<Long, Manager> managersById = new HashMap<>();
            for (Manager m : allManagersInSeason) {
                managersById.put(m.getId(), m);
            }

            send(emitter, "Mail-Server verbunden (" + config.getGmailSmtpServer() + ":" + config.getGmailSmtpPort() + ")");

            int sent = 0;
            int failed = 0;
            long lastKeepAlive = System.currentTimeMillis();

            for (Long managerId : managerIds) {
                Manager manager = managersById.get(managerId);
                if (manager == null) {
                    send(emitter, "✗ Manager-ID " + managerId + " nicht in Saison gefunden");
                    failed++;
                    continue;
                }

                String recipientEmail = manager.getUser() != null ? manager.getUser().getEmail() : null;
                if (recipientEmail == null || recipientEmail.isBlank()) {
                    send(emitter, "✗ [" + manager.getId() + "] " + buildManagerDisplayName(manager) + " hat keine Mailadresse");
                    failed++;
                    continue;
                }

                try {
                    MimeMessage msg = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                    helper.setFrom(config.getGmailSenderEmail());
                    helper.setTo(recipientEmail);
                    String subject = "FFL | " + season.getName() + " | Saisonabschlussmail";
                    helper.setSubject(subject);

                    String html = htmlBuilder.buildHtmlContent(season, payouts, distributionLog, manager);
                    helper.setText(html, true);

                    if (!testMode) {
                        mailSender.send(msg);
                    }

                    send(emitter, (testMode ? "[TEST] " : "") + "✓ [" + manager.getId() + "] " + buildManagerDisplayName(manager) + " (" + recipientEmail + ")");
                    sent++;

                    Thread.sleep(1000);

                    long now = System.currentTimeMillis();
                    if (now - lastKeepAlive > 30000) {
                        emitter.send(SseEmitter.event().comment("keep-alive"));
                        lastKeepAlive = now;
                    }

                    if (sent % 50 == 0 && sent < managerIds.size()) {
                        for (int remaining = 90; remaining > 0; remaining--) {
                            send(emitter, "⏳ " + sent + " Mails versendet, warte " + remaining + " Sekunden...");
                            Thread.sleep(1000);
                        }
                        send(emitter, "⏳ Wartezeit beendet, weiter mit nächstem Block...");
                        lastKeepAlive = System.currentTimeMillis();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    send(emitter, "✗ Versand unterbrochen: " + e.getMessage());
                    failed++;
                } catch (Exception e) {
                    send(emitter, "✗ [" + manager.getId() + "] " + buildManagerDisplayName(manager) + " (" + recipientEmail + "): " + e.getMessage());
                    failed++;
                }
            }

            send(emitter, "Fertig: " + sent + " versendet, " + failed + " fehlgeschlagen.");
            emitter.send(SseEmitter.event().name("complete").data(""));
            emitter.complete();
        } catch (Exception e) {
            try {
                emitter.send(SseEmitter.event().name("error").data("FEHLER: " + e.getMessage()));
            } catch (IOException ignored) {
            }
            emitter.completeWithError(e);
        }
    }

    private void send(SseEmitter emitter, String message) throws IOException {
        emitter.send(SseEmitter.event().data(message));
    }

    private String buildManagerDisplayName(Manager m) {
        if (m.getUser() != null) {
            String fn = Optional.ofNullable(m.getUser().getFirstName()).orElse("");
            String ln = Optional.ofNullable(m.getUser().getLastName()).orElse("");
            String full = (fn + " " + ln).trim();
            if (!full.isBlank()) return full;
        }
        return m.getName();
    }
}
