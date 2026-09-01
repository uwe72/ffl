package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.dto.*;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PointsRepository;
import de.ffl.repository.RoundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final PlayerRankRepository playerRankRepository;
    private final RoundRepository roundRepository;
    private final PointsRepository pointsRepository;

    public DashboardService(
            ManagerRepository managerRepository,
            ManagerRankRepository managerRankRepository,
            PlayerRankRepository playerRankRepository,
            RoundRepository roundRepository,
            PointsRepository pointsRepository) {
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.playerRankRepository = playerRankRepository;
        this.roundRepository = roundRepository;
        this.pointsRepository = pointsRepository;
    }

    @Transactional(readOnly = true)
    public AufstellungDto getAufstellung(Long managerId) {
        Manager manager = managerRepository.findById(managerId)
            .orElseThrow(() -> new IllegalArgumentException("Manager not found: " + managerId));
        Season season = manager.getSeason();
        String phase = phase(season.getSeasonState());
        int currentMatchday = season.getCurrentMatchday() != null ? season.getCurrentMatchday() : 0;
        int transferRound = season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde() : 16;

        List<Player> lineup = activeLineup(manager, currentMatchday, transferRound);
        List<RosterPlayer> roster = fullRoster(manager);

        Map<Long, PlayerRank> rankByPlayer = new HashMap<>();
        if (currentMatchday > 0) {
            Round round = roundRepository.findBySeasonIdAndNumber(season.getId(), currentMatchday).orElse(null);
            if (round != null) {
                List<Long> playerIds = roster.stream().map(r -> r.player.getId()).toList();
                for (PlayerRank pr : playerRankRepository.findByPlayerIdInAndRoundId(playerIds, round.getId())) {
                    rankByPlayer.put(pr.getPlayer().getId(), pr);
                }
            }
        }

        ManagerRank ownRank = currentMatchday > 0
            ? managerRankRepository.findByManagerIdAndRoundNumber(managerId, currentMatchday).orElse(null)
            : null;

        ManagerRank prevRank = currentMatchday > 1
            ? managerRankRepository.findByManagerIdAndRoundNumber(managerId, currentMatchday - 1).orElse(null)
            : null;

        int teilnehmer = managerRepository.findBySeasonId(season.getId()).size();

        boolean isRueckrunde = currentMatchday >= transferRound;

        int kaderwert = 0;
        for (Player p : lineup) {
            if (p != null) kaderwert += p.getPrize();
        }

        List<SpielerAufstellungDto> spieler = new ArrayList<>();
        for (RosterPlayer rp : roster) {
            Player p = rp.player;
            if (p == null) continue;
            PlayerRank pr = rankByPlayer.get(p.getId());
            boolean activeNow = isRueckrunde ? rp.activeRueckrunde : rp.activeHinrunde;
            boolean gespielt = activeNow && pr != null && Boolean.TRUE.equals(pr.getPlayed());
            int einsaetze = pr != null && pr.getNumberMatches() != null ? pr.getNumberMatches() : 0;
            spieler.add(SpielerAufstellungDto.builder()
                .id(p.getId())
                .name(playerName(p))
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .vereinKuerzel(vereinKuerzel(p))
                .vereinLogoUrl(vereinLogoUrl(p))
                .pictureUrl(p.getPictureUrl())
                .position(p.getPosition() != null ? p.getPosition().name() : null)
                .joker(isJoker(manager, p))
                .punkteGesamt(pr != null ? pr.getPointsTotal() : 0)
                .punkteSpieltag(pr != null ? pr.getPointsRound() : 0)
                .positionTotal(pr != null ? pr.getPositionTotal() : 0)
                .positionRound(pr != null ? pr.getPositionRound() : 0)
                .marktwert(p.getPrize())
                .tore(tore(p))
                .zuNull(zuNull(p))
                .gespielt(gespielt)
                .einsaetze(einsaetze)
                .regeln(regelPunkte(p))
                .build());
        }

        return AufstellungDto.builder()
            .phase(phase)
            .spieltag(currentMatchday)
            .teamname(manager.getShortName())
            .punkteGesamt(ownRank != null ? ownRank.getPointsTotal() : null)
            .punkteSpieltag(ownRank != null ? ownRank.getPointsRound() : null)
            .positionGesamt(ownRank != null ? ownRank.getPositionTotal() : null)
            .positionSpieltag(ownRank != null ? ownRank.getPositionRound() : null)
            .teilnehmer(teilnehmer)
            .positionGesamtVorher(prevRank != null ? prevRank.getPositionTotal() : null)
            .positionSpieltagVorher(prevRank != null ? prevRank.getPositionRound() : null)
            .punkteGesamtVorher(prevRank != null ? prevRank.getPointsTotal() : null)
            .punkteSpieltagVorher(prevRank != null ? prevRank.getPointsRound() : null)
            .kaderwert(kaderwert)
            .budget(season.getBudget() != null ? season.getBudget() : 0)
            .spieler(spieler)
            .build();
    }

    @Transactional(readOnly = true)
    public RanglisteDto getRangliste(Long managerId, int umkreis, String modus) {
        Manager manager = managerRepository.findById(managerId)
            .orElseThrow(() -> new IllegalArgumentException("Manager not found: " + managerId));
        Season season = manager.getSeason();
        String phase = phase(season.getSeasonState());
        int currentMatchday = season.getCurrentMatchday() != null ? season.getCurrentMatchday() : 0;
        boolean spieltagModus = "spieltag".equalsIgnoreCase(modus);

        List<Manager> managers = managerRepository.findBySeasonId(season.getId());
        int teilnehmer = managers.size();

        if (season.getSeasonState() == SeasonState.BEFORE_SEASON || currentMatchday <= 0) {
            return buildVorsaisonRangliste(manager, season, phase, currentMatchday, teilnehmer);
        }

        int transferRound = season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde() : 16;
        List<Long> managerIds = managers.stream().map(Manager::getId).toList();

        Map<Long, ManagerRank> currentRanks = new HashMap<>();
        for (ManagerRank r : managerRankRepository.findByManagerIdInAndRoundNumber(managerIds, currentMatchday)) {
            currentRanks.put(r.getManager().getId(), r);
        }

        Map<Long, ManagerRank> prevRanks = new HashMap<>();
        if (currentMatchday > 1) {
            for (ManagerRank r : managerRankRepository.findByManagerIdInAndRoundNumber(managerIds, currentMatchday - 1)) {
                prevRanks.put(r.getManager().getId(), r);
            }
        }

        Comparator<Manager> comp = Comparator
            .comparingInt((Manager m) -> points(m, currentRanks.get(m.getId()), spieltagModus))
            .reversed();
        List<Manager> sorted = new ArrayList<>(managers);
        sorted.sort(comp);

        Map<Long, Integer> position = new HashMap<>();
        int rank = 0;
        Integer prevPoints = null;
        for (int i = 0; i < sorted.size(); i++) {
            Manager m = sorted.get(i);
            int pts = points(m, currentRanks.get(m.getId()), spieltagModus);
            if (prevPoints == null || pts != prevPoints) {
                rank = i + 1;
                prevPoints = pts;
            }
            position.put(m.getId(), rank);
        }

        int ownPoints = points(manager, currentRanks.get(manager.getId()), spieltagModus);
        Manager first = sorted.isEmpty() ? null : sorted.get(0);
        int platz1Points = first != null ? points(first, currentRanks.get(first.getId()), spieltagModus) : 0;

        int preisgeldGrenzePlatz = (int) Math.ceil(teilnehmer * 0.10);
        preisgeldGrenzePlatz = Math.min(Math.max(preisgeldGrenzePlatz, 1), teilnehmer);
        Manager grenze = preisgeldGrenzePlatz <= sorted.size() ? sorted.get(preisgeldGrenzePlatz - 1) : null;
        int grenzePoints = grenze != null ? points(grenze, currentRanks.get(grenze.getId()), spieltagModus) : 0;

        int abstandZuPlatzEins = platz1Points - ownPoints;
        int abstandZurPreisgeldGrenze = ownPoints - grenzePoints;

        int ownIndex = Math.max(0, sorted.indexOf(manager));
        int window = umkreis * 2 + 1;
        int start = ownIndex - umkreis;
        if (start < 0) start = 0;
        if (start + window > sorted.size()) start = Math.max(0, sorted.size() - window);
        int end = Math.min(sorted.size(), start + window);

        List<RanglistenEintragDto> eintraege = new ArrayList<>();
        for (int i = start; i < end; i++) {
            Manager m = sorted.get(i);
            ManagerRank cur = currentRanks.get(m.getId());
            ManagerRank prev = prevRanks.get(m.getId());
            int curPos = position.get(m.getId());
            int mPoints = points(m, cur, spieltagModus);
            int veraenderung = 0;
            if (prev != null) {
                int prevPos = spieltagModus ? prev.getPositionRound() : prev.getPositionTotal();
                veraenderung = prevPos - curPos;
            }
            eintraege.add(RanglistenEintragDto.builder()
                .managerId(m.getId())
                .platz(curPos)
                .veraenderung(veraenderung)
                .teamname(m.getShortName())
                .managername(m.getName())
                .firstName(m.getUser() != null ? m.getUser().getFirstName() : null)
                .lastName(m.getUser() != null ? m.getUser().getLastName() : null)
                .avatarUrl(m.getUser() != null ? "/api/users/" + m.getUser().getId() + "/avatar" : null)
                .punkteGesamt(cur != null ? cur.getPointsTotal() : 0)
                .punkteSpieltag(cur != null ? cur.getPointsRound() : 0)
                .abstandZuMir(ownPoints - mPoints)
                .istIch(m.getId().equals(manager.getId()))
                .build());
        }

        return RanglisteDto.builder()
            .phase(phase)
            .spieltag(currentMatchday)
            .teilnehmer(teilnehmer)
            .preisgeldGrenzePlatz(preisgeldGrenzePlatz)
            .abstandZuPlatzEins(abstandZuPlatzEins)
            .abstandZurPreisgeldGrenze(abstandZurPreisgeldGrenze)
            .eintraege(eintraege)
            .hatOben(start > 0)
            .hatUnten(end < sorted.size())
            .build();
    }

    private RanglisteDto buildVorsaisonRangliste(Manager manager, Season season, String phase, int currentMatchday, int teilnehmer) {
        int transferRound = season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde() : 16;
        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(season.getId());

        Map<Long, Integer> valueByManager = new HashMap<>();
        int max = 0;
        for (Manager m : managers) {
            int v = teamValue(m, transferRound);
            valueByManager.put(m.getId(), v);
            if (v > max) max = v;
        }

        int width = max > 0 ? (int) Math.ceil(max / 10.0) : 1;
        int buckets = Math.max(1, (int) Math.ceil(max / (double) width));

        List<VerteilungEintragDto> verteilung = new ArrayList<>();
        for (int b = 0; b < buckets; b++) {
            int from = b * width;
            int to = (b + 1) * width;
            int count = 0;
            for (Manager m : managers) {
                int v = valueByManager.getOrDefault(m.getId(), 0);
                if (v >= from && v < to) count++;
            }
            verteilung.add(VerteilungEintragDto.builder()
                .von(from)
                .bis(to)
                .anzahl(count)
                .build());
        }

        int eigenerWert = valueByManager.getOrDefault(manager.getId(), 0);

        List<Manager> sorted = new ArrayList<>(managers);
        sorted.sort(Comparator.comparingInt((Manager m) -> valueByManager.getOrDefault(m.getId(), 0)).reversed());

        List<RanglistenEintragDto> eintraege = new ArrayList<>();
        int platz = 0;
        Integer prevValue = null;
        for (int i = 0; i < sorted.size(); i++) {
            Manager m = sorted.get(i);
            int v = valueByManager.getOrDefault(m.getId(), 0);
            if (prevValue == null || v != prevValue) {
                platz = i + 1;
                prevValue = v;
            }
            eintraege.add(RanglistenEintragDto.builder()
                .managerId(m.getId())
                .platz(platz)
                .veraenderung(0)
                .teamname(m.getShortName())
                .managername(m.getName())
                .firstName(m.getUser() != null ? m.getUser().getFirstName() : null)
                .lastName(m.getUser() != null ? m.getUser().getLastName() : null)
                .avatarUrl(m.getUser() != null ? "/api/users/" + m.getUser().getId() + "/avatar" : null)
                .punkteGesamt(0)
                .punkteSpieltag(0)
                .kaderwert(valueByManager.getOrDefault(m.getId(), 0))
                .abstandZuMir(0)
                .istIch(m.getId().equals(manager.getId()))
                .build());
        }

        return RanglisteDto.builder()
            .phase(phase)
            .spieltag(currentMatchday)
            .teilnehmer(teilnehmer)
            .verteilung(verteilung)
            .eigenerWert(eigenerWert)
            .eintraege(eintraege)
            .hatOben(false)
            .hatUnten(false)
            .build();
    }

    private List<Player> activeLineup(Manager m, int roundNumber, int transferRound) {
        List<Player> list = new ArrayList<>();
        addIfNotNull(list, m.getPlayerGoalkeeper());
        addIfNotNull(list, m.getPlayerDefender1());
        addIfNotNull(list, m.getPlayerDefender2());
        addIfNotNull(list, m.getPlayerDefender3());
        addIfNotNull(list, m.getPlayerMidfield1());
        addIfNotNull(list, m.getPlayerMidfield2());
        addIfNotNull(list, m.getPlayerMidfield3());
        addIfNotNull(list, m.getPlayerStriker1());
        addIfNotNull(list, m.getPlayerStriker2());
        addIfNotNull(list, m.getPlayerStriker3());
        addIfNotNull(list, m.getPlayerFreeChoice());
        if (roundNumber >= transferRound) {
            replace(list, m.getPlayerExchangedOld1(), m.getPlayerExchangedNew1());
            replace(list, m.getPlayerExchangedOld2(), m.getPlayerExchangedNew2());
            replace(list, m.getPlayerExchangedOld3(), m.getPlayerExchangedNew3());
        }
        return list;
    }

    private int teamValue(Manager m, int transferRound) {
        int sum = 0;
        for (Player p : activeLineup(m, 0, transferRound)) {
            if (p != null) sum += p.getPrize();
        }
        return sum;
    }

    private static final class RosterPlayer {
        final Player player;
        final boolean activeHinrunde;
        final boolean activeRueckrunde;
        RosterPlayer(Player player, boolean activeHinrunde, boolean activeRueckrunde) {
            this.player = player;
            this.activeHinrunde = activeHinrunde;
            this.activeRueckrunde = activeRueckrunde;
        }
    }

    private List<RosterPlayer> fullRoster(Manager m) {
        List<RosterPlayer> roster = new ArrayList<>();
        Player[] base = new Player[] {
            m.getPlayerGoalkeeper(),
            m.getPlayerDefender1(), m.getPlayerDefender2(), m.getPlayerDefender3(),
            m.getPlayerMidfield1(), m.getPlayerMidfield2(), m.getPlayerMidfield3(),
            m.getPlayerStriker1(), m.getPlayerStriker2(), m.getPlayerStriker3(),
            m.getPlayerFreeChoice()
        };
        for (Player p : base) {
            if (p == null) continue;
            boolean exchangedOut = isExchangedOld(m, p);
            roster.add(new RosterPlayer(p, true, !exchangedOut));
        }
        Player[] news = new Player[] {
            m.getPlayerExchangedNew1(), m.getPlayerExchangedNew2(), m.getPlayerExchangedNew3()
        };
        for (Player p : news) {
            if (p == null) continue;
            roster.add(new RosterPlayer(p, false, true));
        }
        return roster;
    }

    private boolean isExchangedOld(Manager m, Player p) {
        if (p == null) return false;
        return p.equals(m.getPlayerExchangedOld1())
            || p.equals(m.getPlayerExchangedOld2())
            || p.equals(m.getPlayerExchangedOld3());
    }

    private void addIfNotNull(List<Player> list, Player p) {
        if (p != null) list.add(p);
    }

    private void replace(List<Player> list, Player old, Player fresh) {
        if (old == null || fresh == null) return;
        list.remove(old);
        if (!list.contains(fresh)) {
            list.add(fresh);
        }
    }

    private int points(Manager m, ManagerRank rank, boolean spieltagModus) {
        if (rank == null) return 0;
        return spieltagModus ? rank.getPointsRound() : rank.getPointsTotal();
    }

    private boolean isJoker(Manager m, Player p) {
        return m.getPlayerFreeChoice() != null && m.getPlayerFreeChoice().getId().equals(p.getId());
    }

    private String playerName(Player p) {
        if (p.getLastName() != null && !p.getLastName().isBlank()) return p.getLastName();
        return p.getNameKicker();
    }

    private String vereinKuerzel(Player p) {
        Team team = letztesTeam(p);
        return team != null && team.getShortName() != null ? team.getShortName() : "";
    }

    private String vereinLogoUrl(Player p) {
        Team team = letztesTeam(p);
        return team != null ? team.getLogoSUrl() : null;
    }

    private Team letztesTeam(Player p) {
        if (p.getTeams() == null || p.getTeams().isEmpty()) return null;
        return p.getTeams().get(p.getTeams().size() - 1);
    }

    private int tore(Player p) {
        int sum = 0;
        for (Points pt : pointsRepository.findByPlayerId(p.getId())) {
            if (isGoal(pt.getRule())) sum += pt.getNumber();
        }
        return sum;
    }

    private int zuNull(Player p) {
        int count = 0;
        for (Points pt : pointsRepository.findByPlayerId(p.getId())) {
            if (pt.getRule() == Rule.TO_NULL_GOALKEEPER || pt.getRule() == Rule.TO_NULL_DEFENDER) count++;
        }
        return count;
    }

    private boolean isGoal(Rule r) {
        return r == Rule.GOAL_STRIKER
            || r == Rule.GOAL_MIDFIELDER
            || r == Rule.GOAL_DEFENDER
            || r == Rule.GOAL_GOALKEEPER
            || r == Rule.GOAL_GOALKEEPER_BY_PENALTY;
    }

    private List<SpielerAufstellungDto.RulePointDto> regelPunkte(Player p) {
        Map<Rule, Integer> counts = new LinkedHashMap<>();
        for (Points pt : pointsRepository.findByPlayerId(p.getId())) {
            counts.merge(pt.getRule(), 1, Integer::sum);
        }
        return counts.entrySet().stream()
            .map(entry -> SpielerAufstellungDto.RulePointDto.builder()
                .rule(entry.getKey().name())
                .ruleLabel(getRuleLabel(entry.getKey()))
                .count(entry.getValue())
                .points(entry.getKey().getPoints() * entry.getValue())
                .build())
            .sorted(Comparator.comparing(SpielerAufstellungDto.RulePointDto::getPoints).reversed())
            .collect(Collectors.toList());
    }

    private String getRuleLabel(Rule rule) {
        return switch (rule) {
            case GOAL_STRIKER -> "Tor Stürmer";
            case GOAL_MIDFIELDER -> "Tor Mittelfeldspieler";
            case GOAL_DEFENDER -> "Tor Verteidiger";
            case TO_NULL_GOALKEEPER -> "Zu Null Torwart";
            case TO_NULL_DEFENDER -> "Zu Null Verteidiger";
            case GOAL_GOALKEEPER -> "Tor Torwart";
            case GOAL_GOALKEEPER_BY_PENALTY -> "Tor Torwart (Elfmeter)";
        };
    }

    private String phase(SeasonState s) {
        return s == SeasonState.BEFORE_SEASON ? "VORSAISON" : "SAISON";
    }
}
