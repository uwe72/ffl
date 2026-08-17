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
import java.util.List;
import java.util.Map;
import java.util.Set;

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

        Map<Long, PlayerRank> rankByPlayer = new HashMap<>();
        if (currentMatchday > 0) {
            Round round = roundRepository.findBySeasonIdAndNumber(season.getId(), currentMatchday).orElse(null);
            if (round != null) {
                List<Long> playerIds = lineup.stream().map(Player::getId).toList();
                for (PlayerRank pr : playerRankRepository.findByPlayerIdInAndRoundId(playerIds, round.getId())) {
                    rankByPlayer.put(pr.getPlayer().getId(), pr);
                }
            }
        }

        ManagerRank ownRank = currentMatchday > 0
            ? managerRankRepository.findByManagerIdAndRoundNumber(managerId, currentMatchday).orElse(null)
            : null;

        int kaderwert = 0;
        List<SpielerAufstellungDto> spieler = new ArrayList<>();
        for (Player p : lineup) {
            if (p == null) continue;
            kaderwert += p.getPrize();
            PlayerRank pr = rankByPlayer.get(p.getId());
            spieler.add(SpielerAufstellungDto.builder()
                .id(p.getId())
                .name(playerName(p))
                .verein(verein(p))
                .position(p.getPosition() != null ? p.getPosition().name() : null)
                .joker(isJoker(manager, p))
                .punkteGesamt(pr != null ? pr.getPointsTotal() : 0)
                .punkteSpieltag(pr != null ? pr.getPointsRound() : 0)
                .marktwert(p.getPrize())
                .tore(tore(p))
                .zuNull(zuNull(p))
                .build());
        }

        return AufstellungDto.builder()
            .phase(phase)
            .spieltag(currentMatchday)
            .teamname(manager.getShortName())
            .punkteGesamt(ownRank != null ? ownRank.getPointsTotal() : 0)
            .punkteSpieltag(ownRank != null ? ownRank.getPointsRound() : 0)
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
        for (int i = 0; i < sorted.size(); i++) {
            position.put(sorted.get(i).getId(), i + 1);
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

        return RanglisteDto.builder()
            .phase(phase)
            .spieltag(currentMatchday)
            .teilnehmer(teilnehmer)
            .verteilung(verteilung)
            .eigenerWert(eigenerWert)
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

    private String verein(Player p) {
        if (p.getTeams() == null || p.getTeams().isEmpty()) return "";
        Team team = p.getTeams().get(p.getTeams().size() - 1);
        if (team.getShortName() != null && !team.getShortName().isBlank()) return team.getShortName();
        return team.getName();
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

    private String phase(SeasonState s) {
        return s == SeasonState.BEFORE_SEASON ? "VORSAISON" : "SAISON";
    }
}
