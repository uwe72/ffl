package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.repository.*;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SeasonReportMailService {

    private static final Logger log = LoggerFactory.getLogger(SeasonReportMailService.class);

    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final PlayerRankRepository playerRankRepository;
    private final PrizePayoutRepository prizePayoutRepository;
    private final PrizeDistributionLogRepository prizeDistributionLogRepository;
    private final ManagerGroupRepository managerGroupRepository;
    private final EmailAddressRepository emailAddressRepository;
    private final RoundRepository roundRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final SeasonReportHtmlBuilder htmlBuilder;

    public SeasonReportMailService(SeasonRepository seasonRepository,
                                    ManagerRepository managerRepository,
                                    ManagerRankRepository managerRankRepository,
                                    PlayerRankRepository playerRankRepository,
                                    PrizePayoutRepository prizePayoutRepository,
                                    PrizeDistributionLogRepository prizeDistributionLogRepository,
                                    ManagerGroupRepository managerGroupRepository,
                                    EmailAddressRepository emailAddressRepository,
                                    RoundRepository roundRepository,
                                    SystemConfigRepository systemConfigRepository,
                                    SeasonReportHtmlBuilder htmlBuilder) {
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.playerRankRepository = playerRankRepository;
        this.prizePayoutRepository = prizePayoutRepository;
        this.prizeDistributionLogRepository = prizeDistributionLogRepository;
        this.managerGroupRepository = managerGroupRepository;
        this.emailAddressRepository = emailAddressRepository;
        this.roundRepository = roundRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.htmlBuilder = htmlBuilder;
    }

    @Transactional(readOnly = true)
    public void sendSeasonReport(Long seasonId) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
            || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            throw new RuntimeException("Gmail-Zugangsdaten sind nicht vollst\u00e4ndig konfiguriert");
        }

        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));

        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(seasonId);

        Integer lastRoundNumber = findLastRoundNumber(seasonId);
        List<ManagerRank> managerRanks = Collections.emptyList();
        List<PlayerRank> playerRanks = Collections.emptyList();

        if (lastRoundNumber != null) {
            List<Long> managerIds = managers.stream().map(Manager::getId).collect(Collectors.toList());
            managerRanks = managerRankRepository.findByManagerIdInAndRoundNumber(managerIds, lastRoundNumber);

            List<Long> playerIds = season.getPlayers().stream().map(Player::getId).collect(Collectors.toList());
            if (playerIds.isEmpty()) {
                playerIds = managers.stream()
                    .flatMap(m -> getManagerPlayerIds(m).stream())
                    .distinct()
                    .collect(Collectors.toList());
            }

            if (!playerIds.isEmpty()) {
                Round lastRound = roundRepository.findBySeasonIdAndNumber(seasonId, lastRoundNumber).orElse(null);
                if (lastRound != null) {
                    playerRanks = playerRankRepository.findByRoundIdAndPlayedTrue(lastRound.getId());
                    if (playerRanks.isEmpty()) {
                        playerRanks = playerRankRepository.findByPlayerIdInAndRoundId(playerIds, lastRound.getId());
                    }
                }
            }
        }

        List<PrizePayout> payouts = prizePayoutRepository.findBySeasonIdOrderByPositionAsc(seasonId);
        PrizeDistributionLog distributionLog = prizeDistributionLogRepository.findBySeasonId(seasonId).orElse(null);

        List<ManagerGroup> groups = managerGroupRepository.findBySeasonIdFiltered(seasonId);
        Map<Long, List<ManagerRank>> groupRankings = new HashMap<>();
        if (lastRoundNumber != null) {
            for (ManagerGroup group : groups) {
                if (group.getManagers() != null && !group.getManagers().isEmpty()) {
                    List<Long> groupManagerIds = group.getManagers().stream()
                        .map(Manager::getId).collect(Collectors.toList());
                    List<ManagerRank> grpRanks = managerRankRepository.findByManagerIdInAndRoundNumber(groupManagerIds, lastRoundNumber);
                    groupRankings.put(group.getId(), grpRanks);
                }
            }
        }

        List<EmailAddress> emailAddresses = emailAddressRepository.findAll();

        List<String> managerEmails = managers.stream()
            .filter(m -> m.getUser() != null && m.getUser().getEmail() != null)
            .map(m -> m.getUser().getEmail())
            .collect(Collectors.toList());

        String html = htmlBuilder.buildReportHtml(
            season, managerRanks, playerRanks, payouts, distributionLog,
            groups, groupRankings, managers, emailAddresses, managerEmails
        );

        sendMail(config, season.getName(), html);
        log.info("Saison-Report f\u00fcr '{}' an {} gesendet", season.getName(), config.getGmailSenderEmail());
    }

    private Integer findLastRoundNumber(Long seasonId) {
        Integer maxPlayed = playerRankRepository.findMaxPlayedRoundBySeasonId(seasonId);
        if (maxPlayed != null) return maxPlayed;

        List<Round> rounds = roundRepository.findBySeasonIdOrderByNumber(seasonId);
        if (!rounds.isEmpty()) {
            return rounds.get(rounds.size() - 1).getNumber();
        }
        return null;
    }

    private List<Long> getManagerPlayerIds(Manager m) {
        List<Long> ids = new ArrayList<>();
        addIfNotNull(ids, m.getPlayerGoalkeeper());
        addIfNotNull(ids, m.getPlayerDefender1());
        addIfNotNull(ids, m.getPlayerDefender2());
        addIfNotNull(ids, m.getPlayerDefender3());
        addIfNotNull(ids, m.getPlayerMidfield1());
        addIfNotNull(ids, m.getPlayerMidfield2());
        addIfNotNull(ids, m.getPlayerMidfield3());
        addIfNotNull(ids, m.getPlayerStriker1());
        addIfNotNull(ids, m.getPlayerStriker2());
        addIfNotNull(ids, m.getPlayerStriker3());
        addIfNotNull(ids, m.getPlayerFreeChoice());
        addIfNotNull(ids, m.getPlayerExchangedNew1());
        addIfNotNull(ids, m.getPlayerExchangedNew2());
        addIfNotNull(ids, m.getPlayerExchangedNew3());
        return ids;
    }

    private void addIfNotNull(List<Long> ids, Player player) {
        if (player != null && player.getId() != null) {
            ids.add(player.getId());
        }
    }

    private void sendMail(SystemConfig config, String seasonName, String htmlContent) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getGmailSmtpServer() != null ? config.getGmailSmtpServer() : "smtp.gmail.com");
        mailSender.setPort(config.getGmailSmtpPort() != null ? config.getGmailSmtpPort() : 587);
        mailSender.setUsername(config.getGmailSenderEmail());
        mailSender.setPassword(config.getGmailAppPassword());

        java.util.Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "30000");
        props.put("mail.smtp.timeout", "120000");
        props.put("mail.smtp.writetimeout", "120000");

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setSubject("FFL | " + seasonName + " | Saison-Report (Admin)");
            helper.setText(htmlContent, true);
            mailSender.send(msg);
        } catch (Exception e) {
            throw new RuntimeException("Fehler beim Senden des Saison-Reports: " + e.getMessage(), e);
        }
    }
}
