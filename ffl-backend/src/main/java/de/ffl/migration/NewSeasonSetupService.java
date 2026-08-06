package de.ffl.migration;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.Team;
import de.ffl.domain.UserRole;
import de.ffl.repository.GameRepository;
import de.ffl.repository.ManagerGroupRepository;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PasswordResetTokenRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.PointsRepository;
import de.ffl.repository.RoundRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.TeamRepository;
import de.ffl.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Service
public class NewSeasonSetupService {

    private static final int ROUND_COUNT = 34;

    private final KickerPlayerCsvClient csvClient;
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
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EntityManager entityManager;

    public NewSeasonSetupService(KickerPlayerCsvClient csvClient,
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
                                  UserRepository userRepository,
                                  PasswordResetTokenRepository passwordResetTokenRepository,
                                  EntityManager entityManager) {
        this.csvClient = csvClient;
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
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.entityManager = entityManager;
    }

    public SetupPreviewDto preview(String csvUrl) {
        List<KickerPlayerCsvRow> rows = csvClient.loadCsv(csvUrl);
        return buildPreview(rows);
    }

    SetupPreviewDto buildPreview(List<KickerPlayerCsvRow> rows) {
        Map<String, List<KickerPlayerCsvRow>> byTeam = new LinkedHashMap<>();
        for (KickerPlayerCsvRow row : rows) {
            byTeam.computeIfAbsent(row.teamName(), k -> new ArrayList<>()).add(row);
        }
        Map<String, Integer> playersPerPosition = new LinkedHashMap<>();
        playersPerPosition.put("GOALKEEPER", 0);
        playersPerPosition.put("DEFENDER", 0);
        playersPerPosition.put("MIDFIELD", 0);
        playersPerPosition.put("STRIKER", 0);
        for (KickerPlayerCsvRow row : rows) {
            String mapped = mapPosition(row.rawPosition());
            playersPerPosition.merge(mapped, 1, Integer::sum);
        }
        List<SetupPreviewDto.TeamBreakdown> breakdown = new ArrayList<>();
        for (Map.Entry<String, List<KickerPlayerCsvRow>> entry : byTeam.entrySet()) {
            Set<String> positions = entry.getValue().stream()
                    .map(r -> mapPosition(r.rawPosition()))
                    .collect(Collectors.toSet());
            breakdown.add(new SetupPreviewDto.TeamBreakdown(
                    entry.getKey(),
                    entry.getValue().size(),
                    positions.contains("GOALKEEPER"),
                    positions.contains("DEFENDER"),
                    positions.contains("MIDFIELD"),
                    positions.contains("STRIKER")
            ));
        }
        return new SetupPreviewDto(
                byTeam.size(),
                rows.size(),
                playersPerPosition,
                breakdown
        );
    }

    @Transactional
    public Season setup(String csvUrl, String seasonName, Consumer<String> log) {
        log.accept("Lade kicker-CSV von " + csvUrl);
        List<KickerPlayerCsvRow> rows = csvClient.loadCsv(csvUrl);
        if (rows.isEmpty()) {
            throw new IllegalStateException("CSV enthält keine Spieler");
        }
        log.accept("CSV geladen: " + rows.size() + " Spieler");

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
        for (int i = 1; i <= ROUND_COUNT; i++) {
            roundRepository.save(de.ffl.domain.Round.builder()
                    .number(i)
                    .season(newSeason)
                    .build());
        }

        Map<String, Team> teamsByName = new LinkedHashMap<>();
        for (SetupPreviewDto.TeamBreakdown tb : buildPreview(rows).teamBreakdown()) {
            Team team = Team.builder().name(tb.name()).build();
            team = teamRepository.save(team);
            teamsByName.put(tb.name(), team);
            log.accept("Verein angelegt: " + tb.name());
        }
        Set<Team> allTeams = new HashSet<>(teamsByName.values());
        newSeason.setTeams(allTeams);
        seasonRepository.save(newSeason);

        log.accept("");
        log.accept("Erstelle Spieler ...");
        int idx = 0;
        for (KickerPlayerCsvRow row : rows) {
            Team team = teamsByName.get(row.teamName());
            if (team == null) {
                continue;
            }
            List<Team> teamList = new ArrayList<>();
            teamList.add(team);
            Player player = Player.builder()
                    .kickerId(row.kickerId())
                    .nameKicker(row.displayNameShort() != null ? row.displayNameShort() : row.displayNameFull())
                    .firstName(row.firstName())
                    .lastName(row.lastName())
                    .position(Position.valueOf(mapPosition(row.rawPosition())))
                    .prize(row.marketValue() != null ? row.marketValue() : 0)
                    .season(newSeason)
                    .teams(teamList)
                    .build();
            playerRepository.save(player);
            idx++;
        }
        log.accept("Spieler erstellt: " + idx);

        log.accept("");
        log.accept("=== Setup abgeschlossen ===");
        log.accept("Neue Saison: " + seasonName + " (" + teamsByName.size() + " Vereine, " + idx + " Spieler)");
        return newSeason;
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
}