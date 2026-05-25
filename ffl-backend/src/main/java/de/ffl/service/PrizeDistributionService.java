package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.PayoutStatus;
import de.ffl.domain.PrizeDistributionLog;
import de.ffl.domain.PrizePayout;
import de.ffl.domain.Round;
import de.ffl.domain.Season;
import de.ffl.domain.User;
import de.ffl.dto.PrizeDistributionLogDto;
import de.ffl.dto.PrizePayoutDto;
import de.ffl.dto.UpdatePayoutRequest;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PrizeDistributionLogRepository;
import de.ffl.repository.PrizePayoutRepository;
import de.ffl.repository.RoundRepository;
import de.ffl.repository.SeasonRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class PrizeDistributionService {

    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final RoundRepository roundRepository;
    private final PrizePayoutRepository prizePayoutRepository;
    private final PrizeDistributionLogRepository prizeDistributionLogRepository;
    private final ObjectMapper objectMapper;

    public PrizeDistributionService(SeasonRepository seasonRepository,
                                    ManagerRepository managerRepository,
                                    ManagerRankRepository managerRankRepository,
                                    RoundRepository roundRepository,
                                    PrizePayoutRepository prizePayoutRepository,
                                    PrizeDistributionLogRepository prizeDistributionLogRepository,
                                    ObjectMapper objectMapper) {
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.roundRepository = roundRepository;
        this.prizePayoutRepository = prizePayoutRepository;
        this.prizeDistributionLogRepository = prizeDistributionLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<PrizePayoutDto> getPrizeDistribution(Long seasonId) {
        List<PrizePayout> payouts = prizePayoutRepository.findBySeasonIdOrderByPositionAsc(seasonId);
        return payouts.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PrizeDistributionLogDto getDistributionLog(Long seasonId) {
        return prizeDistributionLogRepository.findBySeasonId(seasonId)
            .map(this::convertLogToDto)
            .orElse(null);
    }

    @Transactional
    public PrizePayoutDto updatePayout(Long seasonId, Long managerId, UpdatePayoutRequest request) {
        PrizePayout payout = prizePayoutRepository.findBySeasonIdAndManagerId(seasonId, managerId)
            .orElseThrow(() -> new IllegalArgumentException("PrizePayout nicht gefunden für Saison " + seasonId + " und Manager " + managerId));
        
        if (request.getComment() != null) {
            payout.setComment(request.getComment());
        }
        if (request.getPayoutStatus() != null) {
            payout.setPayoutStatus(request.getPayoutStatus());
        }
        
        PrizePayout saved = prizePayoutRepository.save(payout);
        return convertToDto(saved);
    }

    @Transactional(readOnly = true)
    public MinP1ValidationResult getMinP1Validation(Long seasonId) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new IllegalArgumentException("Saison nicht gefunden"));

        List<Manager> managers = managerRepository.findBySeasonId(seasonId);
        int N = managers.size();
        if (N == 0) {
            return new MinP1ValidationResult(0, 0, 0, false);
        }

        BigDecimal einsatz = season.getSpieleinsatzEuro() != null ? season.getSpieleinsatzEuro() : new BigDecimal("10.00");
        BigDecimal serverkosten = season.getServerkostenEuro() != null ? season.getServerkostenEuro() : new BigDecimal("60.00");
        int spielleiterKostenlos = season.getAnzahlSpielleiter() != null ? season.getAnzahlSpielleiter() : 2;
        BigDecimal fixLetzter = season.getGewinnLetzterPlatzEuro() != null ? season.getGewinnLetzterPlatzEuro() : new BigDecimal("15.00");

        int zahlendeTeilnehmer = Math.max(0, N - spielleiterKostenlos);
        BigDecimal budget = einsatz.multiply(new BigDecimal(zahlendeTeilnehmer)).subtract(serverkosten);
        int numRanks = (int) Math.ceil(N * 0.10);

        if (budget.compareTo(BigDecimal.ZERO) <= 0 || numRanks == 0) {
            return new MinP1ValidationResult(0, 0, 0, false);
        }

        double minP1Required = (budget.doubleValue() * 2.0 / numRanks) - fixLetzter.doubleValue();
        int minPercent = (int) Math.ceil((minP1Required / budget.doubleValue()) * 100);

        return new MinP1ValidationResult(
            (int) Math.ceil(minP1Required),
            minPercent,
            budget.intValue(),
            true
        );
    }

    @Transactional
    public List<PrizePayoutDto> calculateDistribution(Long seasonId) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new IllegalArgumentException("Saison nicht gefunden: " + seasonId));

        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(seasonId);
        if (managers.isEmpty()) {
            throw new IllegalArgumentException("Keine Manager in dieser Saison gefunden");
        }

        List<Round> rounds = roundRepository.findBySeasonIdOrderByNumber(seasonId);
        if (rounds.isEmpty()) {
            throw new IllegalArgumentException("Keine Runden in dieser Saison gefunden");
        }

        Round latestRound = rounds.get(rounds.size() - 1);
        List<Long> managerIds = managers.stream().map(Manager::getId).collect(Collectors.toList());
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdIn(managerIds);

        Map<Long, Integer> managerPointsMap = ranks.stream()
            .filter(r -> r.getRound().getId().equals(latestRound.getId()))
            .collect(Collectors.toMap(
                r -> r.getManager().getId(),
                ManagerRank::getPointsTotal
            ));

        List<ManagerWithPoints> sortedManagers = managers.stream()
            .map(m -> new ManagerWithPoints(m, managerPointsMap.getOrDefault(m.getId(), 0)))
            .sorted(Comparator.comparingInt(ManagerWithPoints::getPointsTotal).reversed())
            .collect(Collectors.toList());

        BigDecimal einsatz = season.getSpieleinsatzEuro() != null ? season.getSpieleinsatzEuro() : new BigDecimal("10.00");
        BigDecimal serverkosten = season.getServerkostenEuro() != null ? season.getServerkostenEuro() : new BigDecimal("60.00");
        int spielleiterKostenlos = season.getAnzahlSpielleiter() != null ? season.getAnzahlSpielleiter() : 2;
        int prozentErster = season.getGewinnErsterPlatzProzent() != null ? season.getGewinnErsterPlatzProzent() : 10;
        BigDecimal fixLetzter = season.getGewinnLetzterPlatzEuro() != null ? season.getGewinnLetzterPlatzEuro() : new BigDecimal("15.00");

        int N = sortedManagers.size();
        int zahlendeTeilnehmer = N - spielleiterKostenlos;
        BigDecimal spieleinsaetzeGesamt = einsatz.multiply(new BigDecimal(zahlendeTeilnehmer));
        BigDecimal budget = spieleinsaetzeGesamt.subtract(serverkosten);
        
        if (budget.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Budget ist nicht positiv. Prüfen Sie die Eingabewerte.");
        }

        int numRanks = (int) Math.ceil(N * 0.10);
        int p1 = (int) Math.round(budget.doubleValue() * prozentErster / 100.0);
        int pLast = fixLetzter.intValue();

        double minP1Required = (budget.doubleValue() * 2.0 / numRanks) - fixLetzter.doubleValue();
        if (p1 < minP1Required) {
            int minPercent = (int) Math.ceil((minP1Required / budget.doubleValue()) * 100);
            throw new IllegalArgumentException(
                String.format("Berechnung unmöglich: Um %,.2f € als absteigende Kurve auf %d Ränge zu verteilen, " +
                    "muss Platz 1 mathematisch mindestens ca. %d € (ca. %d %%) erhalten. " +
                    "Bitte den Prozentsatz erhöhen.", 
                    budget, numRanks, (int) Math.ceil(minP1Required), minPercent));
        }

        OptimizationResult optimizationResult = calculateBasePrizes(numRanks, budget.intValue(), p1, pLast);
        int[] basePrizes = optimizationResult.prizes;
        double bestK = optimizationResult.k;
        int correction = optimizationResult.correction;

        List<PrizeResult> finalPrizes = applySharedPot(sortedManagers, basePrizes, numRanks);

        prizePayoutRepository.deleteBySeasonId(seasonId);
        prizeDistributionLogRepository.deleteBySeasonId(seasonId);

        LocalDateTime now = LocalDateTime.now();
        List<PrizePayout> payouts = new ArrayList<>();
        for (PrizeResult result : finalPrizes) {
            PrizePayout payout = PrizePayout.builder()
                .manager(result.manager)
                .season(season)
                .position(result.position)
                .pointsTotal(result.pointsTotal)
                .prizeAmount(BigDecimal.valueOf(result.prizeAmount).setScale(2, RoundingMode.HALF_UP))
                .calculatedAt(now)
                .build();
            payouts.add(prizePayoutRepository.save(payout));
        }

        String statisticsHtml = generateStatisticsHtml(
            N, zahlendeTeilnehmer, spieleinsaetzeGesamt, serverkosten, budget,
            numRanks, new BigDecimal(p1), fixLetzter, bestK, correction, einsatz
        );

        String basePrizesJson = null;
        try {
            List<BigDecimal> basePrizesList = new ArrayList<>();
            for (int prize : basePrizes) {
                basePrizesList.add(BigDecimal.valueOf(prize).setScale(2, RoundingMode.HALF_UP));
            }
            basePrizesJson = objectMapper.writeValueAsString(basePrizesList);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Fehler beim Serialisieren der Basis-Preisgelder", e);
        }

        PrizeDistributionLog log = PrizeDistributionLog.builder()
            .season(season)
            .totalParticipants(N)
            .payingParticipants(zahlendeTeilnehmer)
            .totalStakes(spieleinsaetzeGesamt.setScale(2, RoundingMode.HALF_UP))
            .serverCosts(serverkosten.setScale(2, RoundingMode.HALF_UP))
            .totalBudget(budget.setScale(2, RoundingMode.HALF_UP))
            .numWinningRanks(numRanks)
            .prizeFirstPlace(new BigDecimal(p1).setScale(2, RoundingMode.HALF_UP))
            .prizeLastPlace(fixLetzter.setScale(2, RoundingMode.HALF_UP))
            .curvatureFactor(bestK)
            .correctionAmount(correction)
            .statisticsHtml(statisticsHtml)
            .basePrizes(basePrizesJson)
            .calculatedAt(now)
            .build();
        prizeDistributionLogRepository.save(log);

        return payouts.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    private OptimizationResult calculateBasePrizes(int numRanks, int budget, int p1, int pLast) {
        int[] bestPrizes = null;
        int bestDiff = Integer.MAX_VALUE;
        double bestK = 0;

        for (int step = 0; step <= 10000; step++) {
            double k = 0.01 + (0.5 - 0.01) * step / 10000.0;
            int[] prizes = new int[numRanks];
            
            for (int i = 1; i <= numRanks; i++) {
                if (i == 1) {
                    prizes[i - 1] = p1;
                } else if (i == numRanks) {
                    prizes[i - 1] = pLast;
                } else {
                    double val = pLast + (p1 - pLast) * 
                        (Math.exp(-k * (i - 1)) - Math.exp(-k * (numRanks - 1))) / 
                        (1 - Math.exp(-k * (numRanks - 1)));
                    prizes[i - 1] = (int) Math.round(val);
                }
            }

            int sum = 0;
            for (int p : prizes) {
                sum += p;
            }

            int diff = Math.abs(sum - budget);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestPrizes = prizes;
                bestK = k;
            }

            if (sum == budget) {
                return new OptimizationResult(prizes, k, 0);
            }
        }

        int correction = 0;
        if (bestPrizes != null && bestDiff > 0) {
            if (bestDiff > 5) {
                throw new IllegalArgumentException(
                    String.format("Die Parameter führen zu einer zu hohen Rundungsabweichung von %d €. " +
                        "Bitte passen Sie den %%-Satz für Platz 1 leicht an.", bestDiff));
            }

            int sum = 0;
            for (int p : bestPrizes) {
                sum += p;
            }
            correction = budget - sum;
            
            if (correction != 0 && bestPrizes.length >= 2) {
                int newP2 = bestPrizes[1] + correction;
                if (newP2 < bestPrizes[0] && newP2 >= bestPrizes[2]) {
                    bestPrizes[1] = newP2;
                } else {
                    distributeCorrectionSafely(bestPrizes, correction);
                }
            }
        }

        return new OptimizationResult(bestPrizes, bestK, correction);
    }

    private void distributeCorrectionSafely(int[] prizes, int correction) {
        int remaining = correction;
        for (int i = 1; i < prizes.length - 1 && remaining != 0; i++) {
            int change = remaining > 0 ? 1 : -1;
            int newVal = prizes[i] + change;
            if (i == 0 || (newVal < prizes[i - 1] && (i == prizes.length - 1 || newVal >= prizes[i + 1]))) {
                prizes[i] = newVal;
                remaining -= change;
            }
        }
    }

    private List<PrizeResult> applySharedPot(List<ManagerWithPoints> sortedManagers, int[] basePrizes, int numRanks) {
        List<PrizeResult> results = new ArrayList<>();
        
        int rankIndex = 0;
        int position = 1;
        
        while (rankIndex < sortedManagers.size() && rankIndex < numRanks) {
            ManagerWithPoints current = sortedManagers.get(rankIndex);
            int currentPoints = current.getPointsTotal();
            
            List<ManagerWithPoints> samePointsGroup = new ArrayList<>();
            samePointsGroup.add(current);
            
            int groupStartRank = rankIndex;
            int groupEndRank = rankIndex;
            
            for (int i = rankIndex + 1; i < sortedManagers.size() && i < numRanks; i++) {
                if (sortedManagers.get(i).getPointsTotal() == currentPoints) {
                    samePointsGroup.add(sortedManagers.get(i));
                    groupEndRank = i;
                } else {
                    break;
                }
            }

            int groupPrizeSum = 0;
            for (int r = groupStartRank; r <= groupEndRank; r++) {
                groupPrizeSum += basePrizes[r];
            }

            double prizePerManager = (double) groupPrizeSum / samePointsGroup.size();
            double roundedPrize = Math.round(prizePerManager * 100.0) / 100.0;

            int groupPosition = groupStartRank + 1;
            for (int i = 0; i < samePointsGroup.size(); i++) {
                ManagerWithPoints mwp = samePointsGroup.get(i);
                double finalPrize;
                if (i == samePointsGroup.size() - 1) {
                    int paidSoFar = (int) Math.round(roundedPrize * 100 * i);
                    int remaining = groupPrizeSum * 100 - paidSoFar;
                    finalPrize = remaining / 100.0;
                } else {
                    finalPrize = roundedPrize;
                }
                results.add(new PrizeResult(mwp.getManager(), groupPosition, currentPoints, finalPrize));
            }

            rankIndex = groupEndRank + 1;
            position = rankIndex + 1;
        }

        return results;
    }

    private String generateStatisticsHtml(int totalParticipants, int payingParticipants,
                                          BigDecimal totalStakes, BigDecimal serverCosts,
                                          BigDecimal totalBudget, int numWinningRanks,
                                          BigDecimal prizeFirstPlace, BigDecimal prizeLastPlace,
                                          double curvatureFactor, int correction, BigDecimal einsatz) {
        StringBuilder html = new StringBuilder();
        
        html.append("<div style=\"font-family: system-ui, -apple-system, sans-serif; color: #f5f5f5;\">");
        
        html.append("<h3 style=\"color: #c9a66b; margin-bottom: 12px; font-size: 18px;\">Mathematische Herleitung der Basiswerte</h3>");
        html.append("<ul style=\"list-style-type: disc; padding-left: 20px; margin: 0;\">");
        
        html.append("<li style=\"margin-bottom: 8px;\">Gesamtteilnehmer: <strong>").append(totalParticipants).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Zahlende Teilnehmer: ")
            .append(totalParticipants).append(" – ").append(totalParticipants - payingParticipants)
            .append(" (Spielleiter) = <strong>").append(payingParticipants).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Spieleinsätze gesamt: ")
            .append(payingParticipants).append(" × ").append(formatCurrency(einsatz))
            .append(" = <strong>").append(formatCurrency(totalStakes)).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Serverkosten: <strong>")
            .append(formatCurrency(serverCosts)).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Auszuschüttender Gesamtbetrag: ")
            .append(formatCurrency(totalStakes)).append(" – ").append(formatCurrency(serverCosts))
            .append(" = <strong>").append(formatCurrency(totalBudget)).append("</strong></li>");
        
        double rawRanks = totalParticipants * 0.10;
        html.append("<li style=\"margin-bottom: 8px;\">Anzahl der Gewinnränge: 10 % von ")
            .append(totalParticipants).append(" = ").append(String.format("%.1f", rawRanks))
            .append(" → aufgerundet auf <strong>").append(numWinningRanks).append(" Gewinnränge</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Gewinn für Platz 1: <strong>")
            .append(formatCurrency(prizeFirstPlace)).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Gewinn für Platz ").append(numWinningRanks)
            .append(": <strong>").append(formatCurrency(prizeLastPlace)).append("</strong></li>");
        
        html.append("</ul>");
        
        html.append("<h3 style=\"color: #c9a66b; margin: 20px 0 12px 0; font-size: 18px;\">Optimierung</h3>");
        html.append("<ul style=\"list-style-type: disc; padding-left: 20px; margin: 0;\">");
        
        html.append("<li style=\"margin-bottom: 8px;\">Gefundener Krümmungsfaktor k: <strong>")
            .append(String.format("%.4f", curvatureFactor)).append("</strong></li>");
        
        if (correction != 0) {
            String sign = correction > 0 ? "+" : "";
            html.append("<li style=\"margin-bottom: 8px;\">Rundungsausgleich: <strong>")
                .append(sign).append(correction).append(" €</strong> (mathematisch auf das obere Mittelfeld verteilt, um exakt ")
                .append(formatCurrency(totalBudget)).append(" zu erreichen)</li>");
        } else {
            html.append("<li style=\"margin-bottom: 8px;\">Rundungsausgleich: Nicht nötig (0 €)</li>");
        }
        
        html.append("</ul>");
        html.append("</div>");
        
        return html.toString();
    }

    private String formatCurrency(BigDecimal value) {
        return String.format("%,.2f €", value).replace(",", "X").replace(".", ",").replace("X", ".");
    }

    private PrizePayoutDto convertToDto(PrizePayout payout) {
        Manager manager = payout.getManager();
        User user = manager.getUser();
        
        return PrizePayoutDto.builder()
            .managerId(manager.getId())
            .managerName(manager.getName())
            .managerFirstName(user != null ? user.getFirstName() : null)
            .managerLastName(user != null ? user.getLastName() : null)
            .managerEmail(user != null ? user.getEmail() : null)
            .position(payout.getPosition())
            .pointsTotal(payout.getPointsTotal())
            .prizeAmount(payout.getPrizeAmount())
            .comment(payout.getComment())
            .payoutStatus(payout.getPayoutStatus())
            .build();
    }

    private PrizeDistributionLogDto convertLogToDto(PrizeDistributionLog log) {
        List<BigDecimal> basePrizes = null;
        if (log.getBasePrizes() != null && !log.getBasePrizes().isEmpty()) {
            try {
                basePrizes = objectMapper.readValue(log.getBasePrizes(), new TypeReference<List<BigDecimal>>() {});
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Fehler beim Deserialisieren der Basis-Preisgelder", e);
            }
        }
        
        return PrizeDistributionLogDto.builder()
            .totalParticipants(log.getTotalParticipants())
            .payingParticipants(log.getPayingParticipants())
            .totalStakes(log.getTotalStakes())
            .serverCosts(log.getServerCosts())
            .totalBudget(log.getTotalBudget())
            .numWinningRanks(log.getNumWinningRanks())
            .prizeFirstPlace(log.getPrizeFirstPlace())
            .prizeLastPlace(log.getPrizeLastPlace())
            .curvatureFactor(log.getCurvatureFactor())
            .correctionAmount(log.getCorrectionAmount())
            .statisticsHtml(log.getStatisticsHtml())
            .calculatedAt(log.getCalculatedAt())
            .basePrizes(basePrizes)
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MinP1ValidationResult {
        private Integer minP1Euro;
        private Integer minP1Percent;
        private Integer budget;
        private Boolean valid;
    }

    private static class ManagerWithPoints {
        private final Manager manager;
        private final int pointsTotal;

        public ManagerWithPoints(Manager manager, int pointsTotal) {
            this.manager = manager;
            this.pointsTotal = pointsTotal;
        }

        public Manager getManager() { return manager; }
        public int getPointsTotal() { return pointsTotal; }
    }

    private static class PrizeResult {
        private final Manager manager;
        private final int position;
        private final int pointsTotal;
        private final double prizeAmount;

        public PrizeResult(Manager manager, int position, int pointsTotal, double prizeAmount) {
            this.manager = manager;
            this.position = position;
            this.pointsTotal = pointsTotal;
            this.prizeAmount = prizeAmount;
        }
    }

    private static class OptimizationResult {
        private final int[] prizes;
        private final double k;
        private final int correction;

        public OptimizationResult(int[] prizes, double k, int correction) {
            this.prizes = prizes;
            this.k = k;
            this.correction = correction;
        }
    }
}
