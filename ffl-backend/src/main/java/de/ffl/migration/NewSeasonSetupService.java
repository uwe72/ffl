package de.ffl.migration;

import de.ffl.domain.Game;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Round;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.Team;
import de.ffl.domain.UserRole;
import de.ffl.migration.KickerClientDatabase.KickerMatch;
import de.ffl.migration.KickerClientDatabase.KickerPlayer;
import de.ffl.migration.KickerClientDatabase.KickerTeam;
import de.ffl.repository.GameRepository;
import de.ffl.repository.ManagerGroupRepository;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PasswordResetTokenRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.PointsRepository;
import de.ffl.repository.PrizeDistributionLogRepository;
import de.ffl.repository.PrizePayoutRepository;
import de.ffl.repository.RoundRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.TeamRepository;
import de.ffl.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

@Service
public class NewSeasonSetupService {

    private static final int ROUND_COUNT = 34;

    private final KickerClientDatabaseClient databaseClient;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final RoundRepository roundRepository;
    private final GameRepository gameRepository;
    private final ManagerRepository managerRepository;
    private final ManagerGroupRepository managerGroupRepository;
    private final ManagerRankRepository managerRankRepository;
    private final PlayerRankRepository playerRankRepository;
    private final PointsRepository pointsRepository;
    private final PrizePayoutRepository prizePayoutRepository;
    private final PrizeDistributionLogRepository prizeDistributionLogRepository;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EntityManager entityManager;

    public NewSeasonSetupService(KickerClientDatabaseClient databaseClient,
                                  SeasonRepository seasonRepository,
                                  TeamRepository teamRepository,
                                  PlayerRepository playerRepository,
                                  RoundRepository roundRepository,
                                  GameRepository gameRepository,
                                  ManagerRepository managerRepository,
                                  ManagerGroupRepository managerGroupRepository,
                                  ManagerRankRepository managerRankRepository,
                                  PlayerRankRepository playerRankRepository,
                                  PointsRepository pointsRepository,
                                  PrizePayoutRepository prizePayoutRepository,
                                  PrizeDistributionLogRepository prizeDistributionLogRepository,
                                  UserRepository userRepository,
                                  PasswordResetTokenRepository passwordResetTokenRepository,
                                  EntityManager entityManager) {
        this.databaseClient = databaseClient;
        this.seasonRepository = seasonRepository;
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
        this.roundRepository = roundRepository;
        this.gameRepository = gameRepository;
        this.managerRepository = managerRepository;
        this.managerGroupRepository = managerGroupRepository;
        this.managerRankRepository = managerRankRepository;
        this.playerRankRepository = playerRankRepository;
        this.pointsRepository = pointsRepository;
        this.prizePayoutRepository = prizePayoutRepository;
        this.prizeDistributionLogRepository = prizeDistributionLogRepository;
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.entityManager = entityManager;
    }

    public SetupPreviewDto preview(String sourceUrl) {
        KickerClientDatabase db = databaseClient.loadDatabase(sourceUrl);
        return buildPreview(db);
    }

    SetupPreviewDto buildPreview(KickerClientDatabase db) {
        Map<String, KickerTeam> teamsById = new LinkedHashMap<>();
        if (db.teams() != null) {
            for (KickerTeam team : db.teams()) {
                teamsById.put(team.id(), team);
            }
        }

        List<KickerPlayer> players = activePlayers(db);

        Map<String, Integer> playersPerPosition = new LinkedHashMap<>();
        playersPerPosition.put("GOALKEEPER", 0);
        playersPerPosition.put("DEFENDER", 0);
        playersPerPosition.put("MIDFIELD", 0);
        playersPerPosition.put("STRIKER", 0);

        Map<String, List<KickerPlayer>> byTeam = new LinkedHashMap<>();
        for (KickerPlayer player : players) {
            byTeam.computeIfAbsent(player.teamId(), k -> new ArrayList<>()).add(player);
            playersPerPosition.merge(mapPosition(player.position()), 1, Integer::sum);
        }

        List<SetupPreviewDto.TeamBreakdown> breakdown = new ArrayList<>();
        for (KickerTeam team : teamsById.values()) {
            List<KickerPlayer> teamPlayers = byTeam.getOrDefault(team.id(), List.of());
            Set<String> positions = new HashSet<>();
            for (KickerPlayer p : teamPlayers) {
                positions.add(mapPosition(p.position()));
            }
            breakdown.add(new SetupPreviewDto.TeamBreakdown(
                    team.name(),
                    teamPlayers.size(),
                    positions.contains("GOALKEEPER"),
                    positions.contains("DEFENDER"),
                    positions.contains("MIDFIELD"),
                    positions.contains("STRIKER")
            ));
        }

        int gamesTotal = db.matches() != null ? db.matches().size() : 0;

        return new SetupPreviewDto(
                teamsById.size(),
                players.size(),
                gamesTotal,
                playersPerPosition,
                breakdown
        );
    }

    @Transactional
    public Season setup(String sourceUrl, String seasonName, Consumer<String> log) {
        log.accept("Lade kicker-Datenbank von " + sourceUrl);
        KickerClientDatabase db = databaseClient.loadDatabase(sourceUrl);
        List<KickerPlayer> players = activePlayers(db);
        if (players.isEmpty()) {
            throw new IllegalStateException("Datenbank enthält keine Spieler");
        }
        if (db.teams() == null || db.teams().isEmpty()) {
            throw new IllegalStateException("Datenbank enthält keine Vereine");
        }
        log.accept("Datenbank geladen: " + db.teams().size() + " Vereine, " + players.size() + " Spieler, "
                + (db.matches() != null ? db.matches().size() : 0) + " Spiele");

        Optional<Season> currentOpt = seasonRepository.findAll().stream().findFirst();
        if (currentOpt.isEmpty()) {
            throw new IllegalStateException("Keine bestehende Saison vorhanden");
        }
        Season oldSeason = currentOpt.get();
        Long oldSeasonId = oldSeason.getId();

        log.accept("");
        log.accept("=== Archiv: Vereine der alten Saison ===");
        for (Team team : oldSeason.getTeams()) {
            log.accept("• " + team.getName()
                    + " | shortName=" + nullSafe(team.getShortName())
                    + " | logoSUrl=" + nullSafe(team.getLogoSUrl())
                    + " | logoXxlUrl=" + nullSafe(team.getLogoXxlUrl()));
        }

        log.accept("");
        log.accept("=== Lösche alte Saisondaten ===");
        log.accept("lösche Manager-Ränge ...");
        managerRankRepository.deleteByRoundSeasonId(oldSeasonId);
        entityManager.flush();
        log.accept("lösche Spieler-Ränge ...");
        playerRankRepository.deleteByRoundSeasonId(oldSeasonId);
        entityManager.flush();
        log.accept("lösche Punkte ...");
        pointsRepository.deleteByPlayerSeasonId(oldSeasonId);
        entityManager.flush();
        log.accept("lösche Gewinnverteilung (Auszahlungen) ...");
        prizePayoutRepository.deleteBySeasonId(oldSeasonId);
        entityManager.flush();
        log.accept("lösche Gewinnverteilungs-Log ...");
        prizeDistributionLogRepository.deleteBySeasonId(oldSeasonId);
        entityManager.flush();
        log.accept("lösche Spiele (mit Aufstellungen) ...");
        gameRepository.deleteAll(gameRepository.findByRoundSeasonId(oldSeasonId));
        entityManager.flush();
        log.accept("lösche Manager-Gruppen ...");
        managerGroupRepository.deleteAll(managerGroupRepository.findBySeasonId(oldSeasonId));
        entityManager.flush();
        log.accept("lösche Manager ...");
        managerRepository.deleteAll(managerRepository.findBySeasonId(oldSeasonId));
        entityManager.flush();
        log.accept("lösche Spieler ...");
        playerRepository.deleteAll(playerRepository.findBySeasonId(oldSeasonId));
        entityManager.flush();
        log.accept("lösche Spieltage ...");
        roundRepository.deleteBySeasonId(oldSeasonId);
        entityManager.flush();
        log.accept("lösche Saison ...");
        seasonRepository.deleteById(oldSeasonId);
        entityManager.flush();
        log.accept("lösche Passwort-Reset-Tokens (Nicht-Admin) ...");
        passwordResetTokenRepository.deleteByUserRoleNot(UserRole.ADMIN);
        entityManager.flush();
        log.accept("lösche Benutzer (Nicht-Admin) ...");
        userRepository.deleteByRoleNot(UserRole.ADMIN);
        entityManager.flush();
        log.accept("lösche alle Vereine ...");
        teamRepository.deleteAll();
        entityManager.flush();

        log.accept("");
        log.accept("=== Erstelle neue Saison '" + seasonName + "' ===");
        Season newSeason = Season.builder()
                .name(seasonName)
                .budget(oldSeason.getBudget())
                .seasonState(SeasonState.BEFORE_SEASON)
                .startRoundRueckrunde(oldSeason.getStartRoundRueckrunde())
                .spieleinsatzEuro(oldSeason.getSpieleinsatzEuro())
                .serverkostenEuro(oldSeason.getServerkostenEuro())
                .anzahlSpielleiter(oldSeason.getAnzahlSpielleiter())
                .gewinnErsterPlatzProzent(oldSeason.getGewinnErsterPlatzProzent())
                .gewinnLetzterPlatzEuro(oldSeason.getGewinnLetzterPlatzEuro())
                .paypalLink(oldSeason.getPaypalLink())
                .bankName(oldSeason.getBankName())
                .iban(oldSeason.getIban())
                .bic(oldSeason.getBic())
                .kontoinhaber(oldSeason.getKontoinhaber())
                .mailText(oldSeason.getMailText())
                .invitationMailText(oldSeason.getInvitationMailText())
                .invitationMailSubject(oldSeason.getInvitationMailSubject())
                .build();
        newSeason = seasonRepository.save(newSeason);
        log.accept("Saison '" + seasonName + "' angelegt (id=" + newSeason.getId() + ")");

        log.accept("Erstelle " + ROUND_COUNT + " Spieltage ...");
        Map<Integer, Round> roundsByNumber = new LinkedHashMap<>();
        for (int i = 1; i <= ROUND_COUNT; i++) {
            Round round = roundRepository.save(Round.builder()
                    .number(i)
                    .season(newSeason)
                    .build());
            roundsByNumber.put(i, round);
        }

        Map<String, Team> teamsByKickerId = new LinkedHashMap<>();
        for (KickerTeam kt : db.teams()) {
            String numericId = numericId(kt.id());
            Team team = Team.builder()
                    .name(kt.name())
                    .shortName(kt.shortName())
                    .logoSUrl(buildTeamLogoUrl(numericId, 140))
                    .logoXxlUrl(buildTeamLogoUrl(numericId, 290))
                    .build();
            team = teamRepository.save(team);
            teamsByKickerId.put(kt.id(), team);
            log.accept("Verein angelegt: " + kt.name());
        }
        Set<Team> allTeams = new HashSet<>(teamsByKickerId.values());
        newSeason.setTeams(allTeams);
        seasonRepository.save(newSeason);

        log.accept("");
        log.accept("Erstelle Spieler ...");
        int playerCount = 0;
        for (KickerPlayer kp : players) {
            Team team = teamsByKickerId.get(kp.teamId());
            if (team == null) {
                continue;
            }
            List<Team> teamList = new ArrayList<>();
            teamList.add(team);
            Player player = Player.builder()
                    .kickerId(kp.id())
                    .nameKicker(kp.displayName() != null ? kp.displayName() : kp.displayLongName())
                    .firstName(kp.firstName())
                    .lastName(kp.lastName())
                    .position(Position.valueOf(mapPosition(kp.position())))
                    .prize(kp.marketValue() != null ? kp.marketValue() : 0)
                    .pictureUrl(kp.seasonImage())
                    .season(newSeason)
                    .teams(teamList)
                    .build();
            playerRepository.save(player);
            playerCount++;
        }
        log.accept("Spieler erstellt: " + playerCount);

        log.accept("");
        log.accept("Erstelle Spiele ...");
        int gameCount = 0;
        int gameSkipped = 0;
        if (db.matches() != null) {
            for (KickerMatch match : db.matches()) {
                Team host = teamsByKickerId.get(match.homeTeamId());
                Team visitor = teamsByKickerId.get(match.guestTeamId());
                Integer roundNumber = roundNumberFromId(match.roundId());
                Round round = roundNumber != null ? roundsByNumber.get(roundNumber) : null;
                if (host == null || visitor == null || round == null) {
                    gameSkipped++;
                    continue;
                }
                Game game = Game.builder()
                        .name(gameName(host, visitor))
                        .round(round)
                        .host(host)
                        .visitor(visitor)
                        .build();
                gameRepository.save(game);
                gameCount++;
            }
        }
        log.accept("Spiele erstellt: " + gameCount + (gameSkipped > 0 ? " (übersprungen: " + gameSkipped + ")" : ""));

        log.accept("");
        log.accept("=== Setup abgeschlossen ===");
        log.accept("Neue Saison: " + seasonName + " (" + teamsByKickerId.size() + " Vereine, "
                + playerCount + " Spieler, " + gameCount + " Spiele)");
        return newSeason;
    }

    private List<KickerPlayer> activePlayers(KickerClientDatabase db) {
        List<KickerPlayer> result = new ArrayList<>();
        if (db.players() == null) {
            return result;
        }
        for (KickerPlayer player : db.players()) {
            if (player.active() == null || player.active()) {
                result.add(player);
            }
        }
        return result;
    }

    private String mapPosition(String raw) {
        if (raw == null) return "MIDFIELD";
        return switch (raw.toUpperCase()) {
            case "GOALKEEPER" -> "GOALKEEPER";
            case "DEFENDER" -> "DEFENDER";
            case "MIDFIELDER" -> "MIDFIELD";
            case "FORWARD" -> "STRIKER";
            default -> "MIDFIELD";
        };
    }

    private String nullSafe(String s) {
        return s == null ? "" : s;
    }

    private String gameName(Team host, Team visitor) {
        String h = host.getShortName() != null ? host.getShortName() : host.getName();
        String v = visitor.getShortName() != null ? visitor.getShortName() : visitor.getName();
        return h + " - " + v;
    }

    String numericId(String kickerId) {
        if (kickerId == null) return null;
        String digits = kickerId.replaceAll("\\D", "");
        if (digits.isBlank()) return null;
        return String.valueOf(Long.parseLong(digits));
    }

    String buildTeamLogoUrl(String numericId, int width) {
        if (numericId == null || numericId.isBlank()) return null;
        return "https://sportsfeed.kicker.de/MediaService/TeamLogo?teamId=" + numericId + "&width=" + width;
    }

    Integer roundNumberFromId(String roundId) {
        if (roundId == null) return null;
        String digits = roundId.replaceAll("\\D", "");
        if (digits.length() < 4) return null;
        try {
            return Integer.parseInt(digits.substring(digits.length() - 4));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
