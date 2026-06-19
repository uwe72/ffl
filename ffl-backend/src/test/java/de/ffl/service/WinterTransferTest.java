package de.ffl.service;

import de.ffl.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class WinterTransferTest extends AbstractSeasonTestBase {

    private Player mane;
    private Player hack;
    private Player scienza;
    private Player diks;
    private Player elMala;
    private Player kaminski;

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();

        mane = findPlayerByName("Filippo Man\u00e9");
        hack = findPlayerByName("Robin Hack");
        scienza = findPlayerByName("Leonardo Scienza");
        diks = findPlayerByName("Kevin Diks");
        elMala = findPlayerByName("Said El Mala");
        kaminski = findPlayerByName("Jakub Kaminski");
    }

    @Test
    void beforeTransferRound_oldPlayersAreActive() {
        seasonCalculationService.calculateSeason(season.getId());

        Set<Player> activePlayers = getActivePlayersForRound(managerUwe72, 15, TRANSFER_ROUND);

        assertThat(activePlayers).contains(mane, hack, scienza);
        assertThat(activePlayers).doesNotContain(diks, elMala, kaminski);
    }

    @Test
    void atTransferRound_newPlayersAreActive() {
        seasonCalculationService.calculateSeason(season.getId());

        Set<Player> activePlayers = getActivePlayersForRound(managerUwe72, TRANSFER_ROUND, TRANSFER_ROUND);

        assertThat(activePlayers).contains(diks, elMala, kaminski);
        assertThat(activePlayers).doesNotContain(mane, hack, scienza);
    }

    @Test
    void afterTransferRound_newPlayersAreActive() {
        seasonCalculationService.calculateSeason(season.getId());

        Set<Player> activePlayers = getActivePlayersForRound(managerUwe72, 34, TRANSFER_ROUND);

        assertThat(activePlayers).contains(diks, elMala, kaminski);
        assertThat(activePlayers).doesNotContain(mane, hack, scienza);
    }

    @Test
    void activeSquad_alwaysHas11Players() {
        seasonCalculationService.calculateSeason(season.getId());

        for (int round = 1; round <= 34; round++) {
            Set<Player> activePlayers = getActivePlayersForRound(managerUwe72, round, TRANSFER_ROUND);
            assertThat(activePlayers)
                    .as("Spieltag %d", round)
                    .hasSize(11);
        }
    }

    @Test
    void transferRound_isConfigurableVariable() {
        assertThat(TRANSFER_ROUND).isEqualTo(16);
    }

    @Test
    void managerPointsReflectTransfer_round15VsRound16() {
        seasonCalculationService.calculateSeason(season.getId());

        Round round15 = roundMap.get(15);
        Round round16 = roundMap.get(16);

        Optional<ManagerRank> rank15 = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round15.getId());
        Optional<ManagerRank> rank16 = managerRankRepository.findByManagerIdAndRoundId(
                managerUwe72.getId(), round16.getId());

        assertThat(rank15).isPresent();
        assertThat(rank16).isPresent();
        assertThat(rank15.get().getPointsTotal()).isEqualTo(147);
        assertThat(rank16.get().getPointsTotal()).isEqualTo(164);
        assertThat(rank16.get().getPointsRound()).isEqualTo(17);
    }

    private Set<Player> getActivePlayersForRound(Manager manager, int roundNumber, int transferRound) {
        Set<Player> players = new java.util.HashSet<>();

        if (manager.getPlayerGoalkeeper() != null) players.add(manager.getPlayerGoalkeeper());
        if (manager.getPlayerDefender1() != null) players.add(manager.getPlayerDefender1());
        if (manager.getPlayerDefender2() != null) players.add(manager.getPlayerDefender2());
        if (manager.getPlayerDefender3() != null) players.add(manager.getPlayerDefender3());
        if (manager.getPlayerMidfield1() != null) players.add(manager.getPlayerMidfield1());
        if (manager.getPlayerMidfield2() != null) players.add(manager.getPlayerMidfield2());
        if (manager.getPlayerMidfield3() != null) players.add(manager.getPlayerMidfield3());
        if (manager.getPlayerStriker1() != null) players.add(manager.getPlayerStriker1());
        if (manager.getPlayerStriker2() != null) players.add(manager.getPlayerStriker2());
        if (manager.getPlayerStriker3() != null) players.add(manager.getPlayerStriker3());
        if (manager.getPlayerFreeChoice() != null) players.add(manager.getPlayerFreeChoice());

        if (roundNumber >= transferRound) {
            if (manager.getPlayerExchangedOld1() != null) players.remove(manager.getPlayerExchangedOld1());
            if (manager.getPlayerExchangedOld2() != null) players.remove(manager.getPlayerExchangedOld2());
            if (manager.getPlayerExchangedOld3() != null) players.remove(manager.getPlayerExchangedOld3());
            if (manager.getPlayerExchangedNew1() != null) players.add(manager.getPlayerExchangedNew1());
            if (manager.getPlayerExchangedNew2() != null) players.add(manager.getPlayerExchangedNew2());
            if (manager.getPlayerExchangedNew3() != null) players.add(manager.getPlayerExchangedNew3());
        }

        return players;
    }

    private Player findPlayerByName(String name) {
        return playerMap.values().stream()
                .filter(p -> p.getNameKicker().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Player not found: " + name));
    }
}
