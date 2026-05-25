package de.ffl.service;

import de.ffl.domain.PrizeDistributionLog;
import de.ffl.domain.PrizePayout;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.PrizeDistributionLogRepository;
import de.ffl.repository.PrizePayoutRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class PrizeDistributionMailService {

    private static final Logger log = LoggerFactory.getLogger(PrizeDistributionMailService.class);

    private final SystemConfigRepository systemConfigRepository;
    private final SeasonRepository seasonRepository;
    private final PrizePayoutRepository prizePayoutRepository;
    private final PrizeDistributionLogRepository prizeDistributionLogRepository;
    private final PrizeDistributionMailTransactionService transactionService;
    private final PrizeDistributionHtmlBuilder htmlBuilder;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    public PrizeDistributionMailService(SystemConfigRepository systemConfigRepository,
                                         SeasonRepository seasonRepository,
                                         PrizePayoutRepository prizePayoutRepository,
                                         PrizeDistributionLogRepository prizeDistributionLogRepository,
                                         PrizeDistributionMailTransactionService transactionService,
                                         PrizeDistributionHtmlBuilder htmlBuilder) {
        this.systemConfigRepository = systemConfigRepository;
        this.seasonRepository = seasonRepository;
        this.prizePayoutRepository = prizePayoutRepository;
        this.prizeDistributionLogRepository = prizeDistributionLogRepository;
        this.transactionService = transactionService;
        this.htmlBuilder = htmlBuilder;
    }

    public SseEmitter streamPrizeDistributionMail(Long seasonId, List<Long> managerIds, boolean testMode) {
        SseEmitter emitter = new SseEmitter(1_200_000L);
        executor.execute(() -> {
            try {
                SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
                    .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

                if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                    || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: Gmail-Zugangsdaten sind nicht vollständig konfiguriert"));
                    emitter.complete();
                    return;
                }

                JavaMailSenderImpl mailSender = buildMailSender(config);
                transactionService.runMailJob(emitter, seasonId, managerIds, mailSender, config, testMode);
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: " + e.getMessage()));
                } catch (Exception ignored) {
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    private JavaMailSenderImpl buildMailSender(SystemConfig config) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(config.getGmailSmtpServer() != null ? config.getGmailSmtpServer() : "smtp.gmail.com");
        sender.setPort(config.getGmailSmtpPort() != null ? config.getGmailSmtpPort() : 587);
        sender.setUsername(config.getGmailSenderEmail());
        sender.setPassword(config.getGmailAppPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "30000");
        props.put("mail.smtp.timeout", "120000");
        props.put("mail.smtp.writetimeout", "120000");
        return sender;
    }

    public String generatePreviewHtml(Long seasonId) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));

        List<PrizePayout> payouts = prizePayoutRepository.findBySeasonIdOrderByPositionAsc(seasonId);
        if (payouts.isEmpty()) {
            throw new RuntimeException("Keine Gewinnverteilung für Saison " + seasonId + " vorhanden");
        }

        PrizeDistributionLog distributionLog = prizeDistributionLogRepository.findBySeasonId(seasonId)
            .orElseThrow(() -> new RuntimeException("Keine Berechnungsstatistik für Saison " + seasonId + " vorhanden"));

        return htmlBuilder.buildHtmlContent(season, payouts, distributionLog, null);
    }
}
