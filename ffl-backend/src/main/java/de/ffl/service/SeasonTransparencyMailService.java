package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SeasonTransparencyMailService {

    private static final Logger log = LoggerFactory.getLogger(SeasonTransparencyMailService.class);

    private static final String POS_COLOR_TW = "#57534e";
    private static final String POS_COLOR_ABW = "#0f766e";
    private static final String POS_COLOR_MF = "#4338ca";
    private static final String POS_COLOR_ST = "#be123c";
    private static final String POS_COLOR_FREI = "#6b6b6b";

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    );

    private final SystemConfigRepository systemConfigRepository;
    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;
    private final SpringTemplateEngine templateEngine;
    private final PlatformTransactionManager transactionManager;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    public SeasonTransparencyMailService(SystemConfigRepository systemConfigRepository,
                                          SeasonRepository seasonRepository,
                                          ManagerRepository managerRepository,
                                          SpringTemplateEngine templateEngine,
                                          PlatformTransactionManager transactionManager) {
        this.systemConfigRepository = systemConfigRepository;
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.templateEngine = templateEngine;
        this.transactionManager = transactionManager;
    }

    @Transactional(readOnly = true)
    public void sendTestMail(Long seasonId) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
            || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            throw new RuntimeException("Gmail-Zugangsdaten sind nicht vollständig konfiguriert");
        }

        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new RuntimeException("Saison nicht gefunden"));

        String html = buildHtml(season);
        String plainText = buildPlainText(season);
        String subject = "FFL | Transparenz-Report Saison " + season.getName();

        try {
            JavaMailSenderImpl mailSender = buildMailSender(config);
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setSubject(subject);
            helper.setText(plainText, html);

            mailSender.send(msg);
            log.info("Transparenz-Report (Test) gesendet an Admin: {}", config.getGmailSenderEmail());
        } catch (Exception e) {
            log.error("Fehler beim Senden des Transparenz-Reports (Test): {}", e.getMessage(), e);
            throw new RuntimeException("Versand fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public SseEmitter streamTransparencyMail(Long seasonId, List<String> emails, boolean testMode) {
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

                TransactionTemplate tx = new TransactionTemplate(transactionManager);
                tx.setReadOnly(true);
                final String[] baseHtml = new String[1];
                final String[] basePlainText = new String[1];
                final String[] subject = new String[1];
                tx.execute(status -> {
                    Season season = seasonRepository.findById(seasonId)
                        .orElseThrow(() -> new RuntimeException("Saison nicht gefunden"));
                    baseHtml[0] = buildHtml(season);
                    basePlainText[0] = buildPlainText(season);
                    subject[0] = "FFL | Transparenz-Report Saison " + season.getName();
                    return null;
                });

                List<String> recipients = new ArrayList<>();
                for (String email : emails) {
                    if (email == null || email.isBlank()) continue;
                    String trimmed = email.trim();
                    if (!EMAIL_PATTERN.matcher(trimmed).matches()) {
                        send(emitter, "✗ übersprungen (ungültige Adresse): " + trimmed);
                        continue;
                    }
                    recipients.add(trimmed);
                }

                JavaMailSenderImpl mailSender = buildMailSender(config);
                send(emitter, "Mail-Server verbunden (" + config.getGmailSmtpServer() + ":" + config.getGmailSmtpPort() + ")");
                if (testMode) {
                    send(emitter, "Sende Report als Testmail an die Admin-Adresse...");
                } else {
                    send(emitter, "Sende Report als 1 BCC-Mail an " + recipients.size() + " Empfänger...");
                }

                if (!testMode && recipients.isEmpty()) {
                    send(emitter, "");
                    send(emitter, "Keine gültigen Empfänger.");
                    emitter.send(SseEmitter.event().name("complete").data(""));
                    emitter.complete();
                    return;
                }

                try {
                    MimeMessage msg = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                    helper.setFrom(config.getGmailSenderEmail());
                    helper.setTo(config.getGmailSenderEmail());
                    if (!testMode && !recipients.isEmpty()) {
                        helper.setBcc(recipients.toArray(new String[0]));
                    }
                    helper.setSubject(subject[0]);
                    helper.setText(basePlainText[0], baseHtml[0]);

                    mailSender.send(msg);

                    if (testMode) {
                        send(emitter, "[TEST] ✓ Report an die Admin-Adresse gesendet");
                    } else {
                        send(emitter, "✓ Report als eine BCC-Mail an " + recipients.size() + " Empfänger gesendet");
                    }
                } catch (Exception e) {
                    send(emitter, "✗ Versand fehlgeschlagen: " + e.getMessage());
                    log.error("Fehler beim Senden des Transparenz-Reports", e);
                }

                send(emitter, "");
                send(emitter, "Fertig." + (testMode ? " (TEST-MODUS)" : ""));
                emitter.send(SseEmitter.event().name("complete").data(""));
                emitter.complete();
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

    @Transactional(readOnly = true)
    public String generatePreviewHtml(Long seasonId) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));
        return buildHtml(season);
    }

    private String buildHtml(Season season) {
        Context context = buildContext(season);
        return templateEngine.process("mail/season-transparency", context);
    }

    private Context buildContext(Season season) {
        Context context = new Context(Locale.GERMANY);
        context.setVariable("seasonName", season.getName() != null ? season.getName() : "Aktuelle Saison");

        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(season.getId());
        sortManagersByName(managers);

        List<ManagerSquadDto> managerSquads = new ArrayList<>();
        int number = 1;
        for (Manager m : managers) {
            managerSquads.add(buildManagerSquadDto(m, number++));
        }
        context.setVariable("managers", managerSquads);
        context.setVariable("managerCount", managers.size());

        context.setVariable("allPlayers", buildAllPlayersTable(season, managers));
        return context;
    }

    private List<AllPlayerRowDto> buildAllPlayersTable(Season season, List<Manager> managers) {
        List<Player> seasonPlayers = season.getPlayers() != null ? new ArrayList<>(season.getPlayers()) : new ArrayList<>();
        if (seasonPlayers.isEmpty()) {
            return List.of();
        }

        List<Long> playerIds = seasonPlayers.stream().map(Player::getId).collect(Collectors.toList());
        List<Object[]> counts = managerRepository.countManagersByPlayerIdIn(playerIds);
        Map<Long, Long> countById = new HashMap<>();
        for (Object[] row : counts) {
            Long playerId = (Long) row[0];
            Long count = (Long) row[1];
            countById.put(playerId, count);
        }
        return buildAllPlayersTable(seasonPlayers, countById);
    }

    static void sortManagersByName(List<Manager> managers) {
        managers.sort(Comparator
            .comparing((Manager m) -> m.getUser() != null ? m.getUser().getFirstName() : null,
                       Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
            .thenComparing(m -> m.getUser() != null ? m.getUser().getLastName() : null,
                           Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
    }

    static ManagerSquadDto buildManagerSquadDto(Manager manager, int number) {
        return new ManagerSquadDto(
            number,
            buildManagerDisplayName(manager),
            manager.getShortName() != null ? manager.getShortName() : "",
            buildPositionGroups(manager)
        );
    }

    static List<AllPlayerRowDto> buildAllPlayersTable(List<Player> seasonPlayers, Map<Long, Long> countById) {
        List<AllPlayerRowDto> rows = new ArrayList<>();
        for (Player p : seasonPlayers) {
            Long count = countById.getOrDefault(p.getId(), 0L);
            if (count <= 0) continue;
            rows.add(new AllPlayerRowDto(
                fullName(p),
                positionShortLabel(p.getPosition()),
                positionColor(p.getPosition()),
                formatPrice(p.getPrize()),
                teamName(p),
                count.intValue()
            ));
        }
        rows.sort(Comparator.comparingInt(AllPlayerRowDto::managerCount).reversed()
            .thenComparing(AllPlayerRowDto::name, String.CASE_INSENSITIVE_ORDER));
        return rows;
    }

    static List<PositionGroupDto> buildPositionGroups(Manager manager) {
        Map<String, Player> playerBySlot = new LinkedHashMap<>();
        playerBySlot.put("TW", manager.getPlayerGoalkeeper());
        playerBySlot.put("ABW1", manager.getPlayerDefender1());
        playerBySlot.put("ABW2", manager.getPlayerDefender2());
        playerBySlot.put("ABW3", manager.getPlayerDefender3());
        playerBySlot.put("MF1", manager.getPlayerMidfield1());
        playerBySlot.put("MF2", manager.getPlayerMidfield2());
        playerBySlot.put("MF3", manager.getPlayerMidfield3());
        playerBySlot.put("ST1", manager.getPlayerStriker1());
        playerBySlot.put("ST2", manager.getPlayerStriker2());
        playerBySlot.put("ST3", manager.getPlayerStriker3());
        playerBySlot.put("FREI", manager.getPlayerFreeChoice());

        Map<String, List<PlayerRowDto>> grouped = new LinkedHashMap<>();
        grouped.put("TW", new ArrayList<>());
        grouped.put("ABW", new ArrayList<>());
        grouped.put("MF", new ArrayList<>());
        grouped.put("ST", new ArrayList<>());

        for (Map.Entry<String, Player> entry : playerBySlot.entrySet()) {
            Player p = entry.getValue();
            if (p == null) continue;

            String slot = entry.getKey();
            String posKey = slot.startsWith("TW") ? "TW"
                : slot.startsWith("ABW") ? "ABW"
                : slot.startsWith("MF") ? "MF"
                : slot.startsWith("ST") ? "ST"
                : null;
            if (posKey == null && p.getPosition() != null) {
                posKey = positionShortLabel(p.getPosition());
            }
            if (posKey == null) posKey = "ST";

            grouped.get(posKey).add(new PlayerRowDto(
                posKey,
                positionColor(posKey),
                fullName(p),
                teamName(p),
                formatPrice(p.getPrize() != null ? p.getPrize() : 0)
            ));
        }

        List<PositionGroupDto> groups = new ArrayList<>();
        for (Map.Entry<String, List<PlayerRowDto>> entry : grouped.entrySet()) {
            if (entry.getValue().isEmpty()) continue;
            groups.add(new PositionGroupDto(
                positionFullLabel(entry.getKey()),
                positionColor(entry.getKey()),
                entry.getValue()
            ));
        }
        return groups;
    }

    private String buildPlainText(Season season) {
        String seasonName = season.getName() != null ? season.getName() : "Aktuelle Saison";
        StringBuilder sb = new StringBuilder();
        sb.append("FFL · Fantasy Football League\r\n");
        sb.append("Transparenz-Report Saison ").append(seasonName).append("\r\n");
        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(season.getId());
        sb.append(managers.size()).append(" teilnehmende Manager!\r\n\r\n");
        sb.append("Hallo,\r\n\r\n");
        sb.append("anbei der Transparenz-Report für die Saison ").append(seasonName).append(". ");
        sb.append("Dieser enthält alle Spieler und alle teilnehmenden Manager.\r\n\r\n");
        sb.append("Dieser Report wird zu Beginn der Saison einmalig versendet um die Transparenz zu erhöhen.\r\n\r\n");
        sb.append("Viele Grüße\r\n");
        sb.append("Uwe\r\n");
        return sb.toString();
    }

    static String buildManagerDisplayName(Manager m) {
        if (m.getUser() != null) {
            String fn = Optional.ofNullable(m.getUser().getFirstName()).orElse("");
            String ln = Optional.ofNullable(m.getUser().getLastName()).orElse("");
            String full = (fn + " " + ln).trim();
            if (!full.isBlank()) return full;
        }
        return m.getName() != null ? m.getName() : "Unbekannt";
    }

    private static String fullName(Player p) {
        if (p == null) return "";
        String first = p.getFirstName() != null ? p.getFirstName().trim() : null;
        String last = p.getLastName() != null ? p.getLastName().trim() : null;
        if (first != null && !first.isEmpty() && last != null && !last.isEmpty()) {
            return first + " " + last;
        }
        if (first != null && !first.isEmpty()) return first;
        if (last != null && !last.isEmpty()) return last;
        return p.getNameKicker() != null ? p.getNameKicker() : "";
    }

    private static String teamName(Player p) {
        if (p == null || p.getTeams() == null || p.getTeams().isEmpty()) return "-";
        return p.getTeams().get(p.getTeams().size() - 1).getName() != null
            ? p.getTeams().get(p.getTeams().size() - 1).getName()
            : "-";
    }

    private static String formatPrice(Integer prize) {
        if (prize == null) return "-";
        return String.format(Locale.GERMANY, "%,d", prize).replace(",", ".") + " €";
    }

    private static String positionShortLabel(Position pos) {
        if (pos == null) return "SP";
        return switch (pos) {
            case GOALKEEPER -> "TW";
            case DEFENDER -> "ABW";
            case MIDFIELD -> "MF";
            case STRIKER -> "ST";
        };
    }

    private static String positionFullLabel(String shortLabel) {
        return switch (shortLabel) {
            case "TW" -> "Torwart";
            case "ABW" -> "Abwehr";
            case "MF" -> "Mittelfeld";
            case "ST" -> "Sturm";
            default -> "Freie Wahl";
        };
    }

    private static String positionColor(Position pos) {
        if (pos == null) return POS_COLOR_FREI;
        return switch (pos) {
            case GOALKEEPER -> POS_COLOR_TW;
            case DEFENDER -> POS_COLOR_ABW;
            case MIDFIELD -> POS_COLOR_MF;
            case STRIKER -> POS_COLOR_ST;
        };
    }

    private static String positionColor(String label) {
        return switch (label) {
            case "TW" -> POS_COLOR_TW;
            case "ABW" -> POS_COLOR_ABW;
            case "MF" -> POS_COLOR_MF;
            case "ST" -> POS_COLOR_ST;
            default -> POS_COLOR_FREI;
        };
    }

    private void send(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event().data(message));
        } catch (Exception e) {
            log.warn("SSE send failed: {}", e.getMessage());
        }
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

    public record PlayerRowDto(String posLabel, String posColorHex, String name, String teamName, String prizeFormatted) {}

    public record PositionGroupDto(String label, String colorHex, List<PlayerRowDto> players) {}

    public record ManagerSquadDto(int number, String displayName, String login, List<PositionGroupDto> positionGroups) {}

    public record AllPlayerRowDto(String name, String positionLabel, String positionColorHex, String prizeFormatted, String teamName, int managerCount) {}
}
