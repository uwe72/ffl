package de.ffl.migration;

import de.ffl.domain.Game;
import de.ffl.domain.Manager;
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
import de.ffl.service.PlayerDeactivationMailService;
import de.ffl.service.PlayerDeactivationMailService.ManagerNotificationDto;
import de.ffl.service.PlayerDeactivationMailService.PlayerRowDto;
import de.ffl.service.TeamChangeMailService;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private static final int MARKET_VALUE_UNKNOWN = 999_000_000;
    private static final java.util.regex.Pattern LOGO_TEAM_ID_PATTERN =
            java.util.regex.Pattern.compile("teamId=(\\d+)");
    public static final String DEFAULT_SOURCE_URL =
            "https://classic.kicker-libero.de/api/gameloop/v1/state/current/se-k00012026.json";

    private boolean hasValidMarketValue(KickerPlayer kp) {
        return kp.marketValue() != null && kp.marketValue() != MARKET_VALUE_UNKNOWN;
    }

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
    private final PlayerDeactivationMailService playerDeactivationMailService;

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
                                  EntityManager entityManager,
                                  PlayerDeactivationMailService playerDeactivationMailService) {
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
        this.playerDeactivationMailService = playerDeactivationMailService;
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

        List<KickerPlayer> players = activePlayers(db).stream()
                .filter(this::hasValidMarketValue)
                .toList();

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
                    .kickerId(kt.id())
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
        int playersSkipped = 0;
        for (KickerPlayer kp : players) {
            Team team = teamsByKickerId.get(kp.teamId());
            if (team == null) {
                continue;
            }
            if (!hasValidMarketValue(kp)) {
                playersSkipped++;
                log.accept("Spieler übersprungen (Marktwert unbekannt): "
                        + kickerDisplayName(kp) + " (" + team.getName() + ")");
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
                    .prize(kp.marketValue())
                    .pictureUrl(resolvePictureUrl(kp))
                    .season(newSeason)
                    .teams(teamList)
                    .build();
            playerRepository.save(player);
            playerCount++;
        }
        log.accept("Spieler erstellt: " + playerCount);
        if (playersSkipped > 0) {
            log.accept("Spieler mit unbekanntem Marktwert übersprungen: " + playersSkipped);
        }

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

    public record PlayerChange(String name, String club, Integer prize, String fromClub, String managers, String position) {}

    public record UpdateResult(int playersCreated, int teamChanges, int playersDeactivated,
                               List<PlayerChange> newPlayers, List<PlayerChange> teamChangeList,
                               List<PlayerChange> deactivatedPlayers, List<PlayerChange> skippedPlayers) {
        public UpdateResult(int playersCreated, int teamChanges, int playersDeactivated) {
            this(playersCreated, teamChanges, playersDeactivated,
                    List.of(), List.of(), List.of(), List.of());
        }
    }

    @Transactional
    public UpdateResult updatePlayers(String sourceUrl, Consumer<String> log) {
        log.accept("Lade kicker-Datenbank von " + sourceUrl);
        KickerClientDatabase db = databaseClient.loadDatabase(sourceUrl);

        if (db.teams() == null || db.teams().isEmpty()) {
            throw new IllegalStateException("Keine Vereine in der kicker-Datenbank gefunden");
        }
        List<KickerPlayer> players = activePlayers(db);
        if (players.isEmpty()) {
            throw new IllegalStateException("Keine Spieler in der kicker-Datenbank gefunden");
        }

        Season season = seasonRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Keine aktive Saison vorhanden"));
        boolean beforeSeason = season.getSeasonState() == SeasonState.BEFORE_SEASON;

        log.accept("Saison: " + season.getName() + " (id=" + season.getId() + ")");
        log.accept("Saison-Status: " + (beforeSeason ? "Vor Saison" : season.getSeasonState()));
        if (!beforeSeason) {
            log.accept("Hinweis: Vereinswechsel werden nur im Status 'Vor Saison' übernommen.");
        }

        Map<String, KickerTeam> kickerTeamsById = new LinkedHashMap<>();
        Map<String, KickerTeam> kickerTeamsByName = new LinkedHashMap<>();
        Map<String, KickerTeam> kickerTeamsByNumericId = new LinkedHashMap<>();
        for (KickerTeam kt : db.teams()) {
            kickerTeamsById.put(kt.id(), kt);
            String numeric = numericId(kt.id());
            if (numeric != null && !numeric.isBlank()) {
                kickerTeamsByNumericId.putIfAbsent(numeric, kt);
            }
            if (kt.name() != null && !kt.name().isBlank()) {
                kickerTeamsByName.putIfAbsent(kt.name().trim().toLowerCase(), kt);
            }
        }

        Map<String, Team> teamsByKickerId = new LinkedHashMap<>();
        int backfilled = 0;
        for (Team team : teamRepository.findBySeasonId(season.getId())) {
            String kickerId = team.getKickerId();
            if (kickerId == null || kickerId.isBlank()) {
                kickerId = backfillTeamKickerId(team, kickerTeamsByNumericId, kickerTeamsByName);
                if (kickerId != null) {
                    team.setKickerId(kickerId);
                    teamRepository.save(team);
                    backfilled++;
                    log.accept("Verein kickerId ergänzt: " + team.getName() + " -> " + kickerId);
                }
            }
            if (kickerId != null && !kickerId.isBlank()) {
                teamsByKickerId.put(kickerId, team);
            }
        }
        if (backfilled > 0) {
            log.accept("Vereine mit kickerId ergänzt: " + backfilled);
        }

        Map<String, Player> existingByKickerId = new LinkedHashMap<>();
        for (Player p : playerRepository.findBySeasonIdWithTeams(season.getId())) {
            if (p.getKickerId() != null && !p.getKickerId().isBlank()) {
                existingByKickerId.put(p.getKickerId(), p);
            }
        }

        log.accept("");
        log.accept("Aktualisiere Spieler ...");
        int playersCreated = 0;
        int playersSkipped = 0;
        int teamChanges = 0;
        List<PlayerChange> newPlayers = new ArrayList<>();
        List<PlayerChange> teamChangeList = new ArrayList<>();
        List<PlayerChange> deactivatedPlayers = new ArrayList<>();
        List<PlayerChange> skippedPlayers = new ArrayList<>();
        Set<String> activeKickerIds = new HashSet<>();
        for (KickerPlayer kp : players) {
            activeKickerIds.add(kp.id());
            Team targetTeam = teamsByKickerId.get(kp.teamId());
            if (targetTeam == null) {
                log.accept("Warnung: Kein Verein für kickerId " + kp.teamId()
                        + " (Spieler " + kickerDisplayName(kp) + " übersprungen)");
                continue;
            }
            Player existing = existingByKickerId.get(kp.id());
            if (existing == null) {
                if (!hasValidMarketValue(kp)) {
                    playersSkipped++;
                    skippedPlayers.add(new PlayerChange(kickerFullName(kp), targetTeam.getName(),
                            null, null, null, positionLabel(Position.valueOf(mapPosition(kp.position())))));
                    log.accept("Spieler übersprungen (Marktwert unbekannt): "
                            + kickerDisplayName(kp) + " (" + targetTeam.getName() + ")");
                    continue;
                }
                List<Team> teamList = new ArrayList<>();
                teamList.add(targetTeam);
                Player player = Player.builder()
                        .kickerId(kp.id())
                        .nameKicker(kickerDisplayName(kp))
                        .firstName(kp.firstName())
                        .lastName(kp.lastName())
                        .position(Position.valueOf(mapPosition(kp.position())))
                        .prize(kp.marketValue())
                        .pictureUrl(resolvePictureUrl(kp))
                        .season(season)
                        .teams(teamList)
                        .build();
                playerRepository.save(player);
                playersCreated++;
                newPlayers.add(new PlayerChange(kickerFullName(kp), targetTeam.getName(),
                        kp.marketValue(), null, null, positionLabel(Position.valueOf(mapPosition(kp.position())))));
                log.accept("Neuer Spieler: " + kickerFullName(kp) + " (" + targetTeam.getName()
                        + ") · " + formatPrize(kp.marketValue()));
            } else if (beforeSeason) {
                Team currentTeam = (existing.getTeams() == null || existing.getTeams().isEmpty())
                        ? null : existing.getTeams().get(0);
                if (currentTeam == null || !targetTeam.getId().equals(currentTeam.getId())) {
                    String oldName = currentTeam == null ? "(kein)" : currentTeam.getName();
                    existing.getTeams().clear();
                    existing.getTeams().add(targetTeam);
                    playerRepository.save(existing);
                    teamChanges++;
                    List<Manager> affectedManagers = managerRepository.findManagersByPlayerId(existing.getId());
                    teamChangeList.add(new PlayerChange(fullName(existing), targetTeam.getName(),
                            existing.getPrize(), oldName, managerNames(affectedManagers), positionLabel(existing.getPosition())));
                    log.accept("Vereinswechsel: " + existing.getNameKicker()
                            + " (" + oldName + " -> " + targetTeam.getName() + ")");
                }
            }
        }

        log.accept("");
        log.accept("Prüfe Aktiv-Status ...");
        int playersDeactivated = 0;
        int playersReactivated = 0;
        Map<Long, ManagerNotificationAccumulator> notificationsByManager = new LinkedHashMap<>();
        for (Map.Entry<String, Player> entry : existingByKickerId.entrySet()) {
            Player existing = entry.getValue();
            boolean inActiveKicker = activeKickerIds.contains(entry.getKey());
            if (!inActiveKicker) {
                if (!Boolean.FALSE.equals(existing.getAktiv())) {
                    existing.setAktiv(false);
                    playerRepository.save(existing);
                    playersDeactivated++;
                    List<Manager> affectedManagers = managerRepository.findManagersByPlayerId(existing.getId());
                    Team deactivatedTeam = firstTeam(existing);
                    deactivatedPlayers.add(new PlayerChange(fullName(existing),
                            deactivatedTeam != null ? deactivatedTeam.getName() : null,
                            existing.getPrize(), null, managerNames(affectedManagers), positionLabel(existing.getPosition())));
                    log.accept("Spieler deaktiviert: " + formatDeactivatedPlayer(existing, affectedManagers));
                    collectDeactivationNotifications(notificationsByManager, existing, affectedManagers);
                }
            } else {
                if (Boolean.FALSE.equals(existing.getAktiv())) {
                    existing.setAktiv(true);
                    playerRepository.save(existing);
                    playersReactivated++;
                    log.accept("Spieler reaktiviert: " + existing.getNameKicker());
                }
            }
        }
        dispatchDeactivationNotifications(notificationsByManager, season.getName(), season.getSeasonState());

        log.accept("");
        log.accept("=== Spieler-Update abgeschlossen ===");
        log.accept("Neue Spieler angelegt: " + playersCreated);
        if (beforeSeason) {
            log.accept("Vereinswechsel aktualisiert: " + teamChanges);
        } else {
            log.accept("Vereinswechsel aktualisiert: 0 (nur im Status 'Vor Saison')");
        }
        log.accept("Spieler deaktiviert: " + playersDeactivated);
        if (playersReactivated > 0) {
            log.accept("Spieler reaktiviert: " + playersReactivated);
        }
        if (playersSkipped > 0) {
            log.accept("Spieler mit unbekanntem Marktwert übersprungen: " + playersSkipped);
        }

        return new UpdateResult(playersCreated, teamChanges, playersDeactivated,
                newPlayers, teamChangeList, deactivatedPlayers, skippedPlayers);
    }

    private String backfillTeamKickerId(Team team, Map<String, KickerTeam> kickerTeamsByNumericId,
                                        Map<String, KickerTeam> kickerTeamsByName) {
        String logoUrl = team.getLogoSUrl();
        if (logoUrl != null && !logoUrl.isBlank()) {
            java.util.regex.Matcher m = LOGO_TEAM_ID_PATTERN.matcher(logoUrl);
            if (m.find()) {
                String numeric = m.group(1);
                KickerTeam kt = kickerTeamsByNumericId.get(numeric);
                if (kt != null) {
                    return kt.id();
                }
            }
        }
        if (team.getName() == null || team.getName().isBlank()) {
            return null;
        }
        KickerTeam kt = kickerTeamsByName.get(team.getName().trim().toLowerCase());
        return kt == null ? null : kt.id();
    }

    private String kickerDisplayName(KickerPlayer kp) {
        return kp.displayName() != null ? kp.displayName() : kp.displayLongName();
    }

    private String kickerFullName(KickerPlayer kp) {
        String first = kp.firstName();
        String last = kp.lastName();
        if (first != null && !first.isBlank() && last != null && !last.isBlank()) {
            return first.trim() + " " + last.trim();
        }
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (last != null && !last.isBlank()) {
            return last.trim();
        }
        return kickerDisplayName(kp);
    }

    private String formatPrize(Integer prize) {
        if (prize == null) {
            return "–";
        }
        return String.format(java.util.Locale.GERMANY, "%,d €", prize);
    }

    private String positionLabel(Position position) {
        return TeamChangeMailService.positionFullLabel(TeamChangeMailService.positionLabel(position));
    }

    private String managerNames(List<Manager> managers) {
        if (managers == null || managers.isEmpty()) {
            return null;
        }
        return managers.stream()
                .map(Manager::getName)
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private String formatDeactivatedPlayer(Player player, List<Manager> managers) {
        StringBuilder sb = new StringBuilder();

        sb.append(fullName(player));

        Team team = firstTeam(player);
        if (team != null && team.getName() != null && !team.getName().isBlank()) {
            sb.append(" (").append(team.getName()).append(")");
        }

        if (managers.isEmpty()) {
            sb.append(" — in keinem Team");
        } else {
            String names = managers.stream()
                    .map(Manager::getName)
                    .collect(java.util.stream.Collectors.joining(", "));
            sb.append(" — im Team bei ").append(managers.size())
                    .append(managers.size() == 1 ? " Manager: " : " Managern: ")
                    .append(names);
        }

        return sb.toString();
    }

    private String fullName(Player player) {
        String first = player.getFirstName();
        String last = player.getLastName();
        if (first != null && !first.isBlank() && last != null && !last.isBlank()) {
            return first.trim() + " " + last.trim();
        }
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (last != null && !last.isBlank()) {
            return last.trim();
        }
        return player.getNameKicker();
    }

    private Team firstTeam(Player player) {
        return (player.getTeams() == null || player.getTeams().isEmpty())
                ? null : player.getTeams().get(0);
    }

    private void collectDeactivationNotifications(Map<Long, ManagerNotificationAccumulator> notificationsByManager,
                                                  Player player, List<Manager> managers) {
        Team team = firstTeam(player);
        String teamName = team != null && team.getName() != null ? team.getName() : "";
        String posLabel = TeamChangeMailService.positionLabel(player.getPosition());
        PlayerRowDto row = new PlayerRowDto(
                posLabel,
                TeamChangeMailService.positionColor(posLabel),
                TeamChangeMailService.positionBg(posLabel),
                fullName(player),
                teamName);
        for (Manager manager : managers) {
            if (manager.getUser() == null) {
                continue;
            }
            String email = manager.getUser().getEmail();
            if (email == null || email.isBlank()) {
                continue;
            }
            ManagerNotificationAccumulator acc = notificationsByManager.computeIfAbsent(
                    manager.getId(),
                    id -> new ManagerNotificationAccumulator(email, deriveGreeting(manager)));
            acc.players().add(row);
        }
    }

    private String deriveGreeting(Manager manager) {
        String name = manager.getName();
        if (name != null && !name.isBlank()) {
            return name;
        }
        String shortName = manager.getShortName();
        return shortName != null ? shortName : "Manager";
    }

    private void dispatchDeactivationNotifications(Map<Long, ManagerNotificationAccumulator> notificationsByManager,
                                                   String seasonName, SeasonState seasonState) {
        if (notificationsByManager.isEmpty()) {
            return;
        }
        List<ManagerNotificationDto> notifications = new ArrayList<>();
        for (ManagerNotificationAccumulator acc : notificationsByManager.values()) {
            notifications.add(new ManagerNotificationDto(acc.email(), acc.greeting(), acc.players()));
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    playerDeactivationMailService.sendDeactivationNotifications(notifications, seasonName, seasonState);
                }
            });
        } else {
            playerDeactivationMailService.sendDeactivationNotifications(notifications, seasonName, seasonState);
        }
    }

    private record ManagerNotificationAccumulator(String email, String greeting, List<PlayerRowDto> players) {
        ManagerNotificationAccumulator(String email, String greeting) {
            this(email, greeting, new ArrayList<>());
        }
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

    String resolvePictureUrl(KickerPlayer kp) {
        return firstNonBlank(kp.seasonImage(), kp.photo(), kp.photoFallback(), kp.fallbackImage());
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
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
