package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.dto.WinterTransferRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WinterTransferApiTest extends AbstractSeasonTestBase {

    @Autowired
    private ManagerService managerService;

    private Player mane;
    private Player hack;
    private Player scienza;

    private Player replacementForMane;
    private Player replacementForHack;
    private Player replacementForScienza;

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();

        mane = findPlayerByName("Filippo Man\u00e9");
        hack = findPlayerByName("Robin Hack");
        scienza = findPlayerByName("Leonardo Scienza");

        season.setSeasonState(SeasonState.RUNNING_HINRUNDE);
        season = seasonRepository.save(season);

        managerUwe72.setBudget(999999999);
        managerUwe72 = managerRepository.save(managerUwe72);

        replacementForMane = playerRepository.save(Player.builder()
            .nameKicker("Replacement A").position(mane.getPosition()).prize(mane.getPrize())
            .season(season).teams(new ArrayList<>()).build());
        replacementForHack = playerRepository.save(Player.builder()
            .nameKicker("Replacement B").position(hack.getPosition()).prize(hack.getPrize())
            .season(season).teams(new ArrayList<>()).build());
        replacementForScienza = playerRepository.save(Player.builder()
            .nameKicker("Replacement C").position(scienza.getPosition()).prize(scienza.getPrize())
            .season(season).teams(new ArrayList<>()).build());

        entityManager.flush();
        entityManager.clear();
        managerUwe72 = managerRepository.findById(managerUwe72.getId()).orElseThrow();
    }

    @Test
    void successfulSingleTransfer() {
        WinterTransferRequest request = buildRequest(
            List.of(new long[]{mane.getId(), replacementForMane.getId()})
        );

        Manager result = managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request);

        assertThat(result.getPlayerExchangedOld1()).isNotNull();
        assertThat(result.getPlayerExchangedOld1().getId()).isEqualTo(mane.getId());
        assertThat(result.getPlayerExchangedNew1()).isNotNull();
        assertThat(result.getPlayerExchangedNew1().getId()).isEqualTo(replacementForMane.getId());
        assertThat(result.getPlayerExchangedOld2()).isNull();
        assertThat(result.getPlayerExchangedNew2()).isNull();
        assertThat(result.getPlayerExchangedOld3()).isNull();
        assertThat(result.getPlayerExchangedNew3()).isNull();
    }

    @Test
    void successfulThreeTransfers() {
        WinterTransferRequest request = buildRequest(List.of(
            new long[]{mane.getId(), replacementForMane.getId()},
            new long[]{hack.getId(), replacementForHack.getId()},
            new long[]{scienza.getId(), replacementForScienza.getId()}
        ));

        Manager result = managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request);

        assertThat(result.getPlayerExchangedOld1().getId()).isEqualTo(mane.getId());
        assertThat(result.getPlayerExchangedNew1().getId()).isEqualTo(replacementForMane.getId());
        assertThat(result.getPlayerExchangedOld2().getId()).isEqualTo(hack.getId());
        assertThat(result.getPlayerExchangedNew2().getId()).isEqualTo(replacementForHack.getId());
        assertThat(result.getPlayerExchangedOld3().getId()).isEqualTo(scienza.getId());
        assertThat(result.getPlayerExchangedNew3().getId()).isEqualTo(replacementForScienza.getId());
    }

    @Test
    void rejectsWhenNotHinrunde_beforeSeason() {
        season.setSeasonState(SeasonState.BEFORE_SEASON);
        seasonRepository.save(season);
        entityManager.flush();
        entityManager.clear();

        WinterTransferRequest request = buildRequest(
            List.of(new long[]{mane.getId(), replacementForMane.getId()})
        );

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hinrunde");
    }

    @Test
    void rejectsWhenNotHinrunde_rueckrunde() {
        season.setSeasonState(SeasonState.RUNNING_RUECKRUNDE);
        seasonRepository.save(season);
        entityManager.flush();
        entityManager.clear();

        WinterTransferRequest request = buildRequest(
            List.of(new long[]{mane.getId(), replacementForMane.getId()})
        );

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Hinrunde");
    }

    @Test
    void rejectsMoreThanThreeTransfers() {
        WinterTransferRequest request = new WinterTransferRequest();
        List<WinterTransferRequest.Transfer> transfers = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            WinterTransferRequest.Transfer t = new WinterTransferRequest.Transfer();
            t.setOldPlayerId((long) (i + 1));
            t.setNewPlayerId((long) (i + 100));
            transfers.add(t);
        }
        request.setTransfers(transfers);

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("3");
    }

    @Test
    void rejectsOldPlayerNotInLineup() {
        WinterTransferRequest request = buildRequest(
            List.of(new long[]{replacementForMane.getId(), mane.getId()})
        );

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nicht in deiner aktuellen Aufstellung");
    }

    @Test
    void rejectsNewPlayerAlreadyInLineup() {
        Player existingPlayer = managerUwe72.getPlayerDefender1();

        WinterTransferRequest request = buildRequest(
            List.of(new long[]{mane.getId(), existingPlayer.getId()})
        );

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("bereits in deiner Aufstellung");
    }

    @Test
    void rejectsDuplicateOldPlayer() {
        WinterTransferRequest request = buildRequest(List.of(
            new long[]{mane.getId(), replacementForMane.getId()},
            new long[]{mane.getId(), replacementForHack.getId()}
        ));

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("einmal getauscht");
    }

    @Test
    void rejectsDuplicateNewPlayer() {
        WinterTransferRequest request = buildRequest(List.of(
            new long[]{mane.getId(), replacementForMane.getId()},
            new long[]{hack.getId(), replacementForMane.getId()}
        ));

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("einmal gew\u00e4hlt");
    }

    @Test
    void rejectsSameOldAndNewPlayer() {
        WinterTransferRequest request = buildRequest(
            List.of(new long[]{mane.getId(), mane.getId()})
        );

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("identisch");
    }

    @Test
    void emptyTransfersClearsExistingExchanges() {
        managerUwe72.setPlayerExchangedOld1(mane);
        managerUwe72.setPlayerExchangedNew1(replacementForMane);
        managerRepository.save(managerUwe72);
        entityManager.flush();
        entityManager.clear();

        WinterTransferRequest request = new WinterTransferRequest();
        request.setTransfers(List.of());

        Manager result = managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request);

        assertThat(result.getPlayerExchangedOld1()).isNull();
        assertThat(result.getPlayerExchangedNew1()).isNull();
    }

    @Test
    void transfersCanBeOverwritten() {
        WinterTransferRequest request1 = buildRequest(
            List.of(new long[]{mane.getId(), replacementForMane.getId()})
        );
        managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request1);
        entityManager.flush();
        entityManager.clear();

        WinterTransferRequest request2 = buildRequest(
            List.of(new long[]{hack.getId(), replacementForHack.getId()})
        );
        Manager result = managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request2);

        assertThat(result.getPlayerExchangedOld1().getId()).isEqualTo(hack.getId());
        assertThat(result.getPlayerExchangedNew1().getId()).isEqualTo(replacementForHack.getId());
        assertThat(result.getPlayerExchangedOld2()).isNull();
        assertThat(result.getPlayerExchangedNew2()).isNull();
    }

    @Test
    void rejectsBudgetExceeded() {
        managerUwe72.setBudget(30000000);
        managerRepository.save(managerUwe72);

        Player expensivePlayer = Player.builder()
            .nameKicker("Expensive Player")
            .position(mane.getPosition())
            .prize(30000000)
            .season(season)
            .teams(new ArrayList<>())
            .build();
        expensivePlayer = playerRepository.save(expensivePlayer);
        entityManager.flush();
        entityManager.clear();

        WinterTransferRequest request = buildRequest(
            List.of(new long[]{mane.getId(), expensivePlayer.getId()})
        );

        assertThatThrownBy(() -> managerService.updateWinterTransfers(managerUwe72.getUser().getId(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("budget");
    }

    private WinterTransferRequest buildRequest(List<long[]> pairs) {
        WinterTransferRequest request = new WinterTransferRequest();
        List<WinterTransferRequest.Transfer> transfers = new ArrayList<>();
        for (long[] pair : pairs) {
            WinterTransferRequest.Transfer t = new WinterTransferRequest.Transfer();
            t.setOldPlayerId(pair[0]);
            t.setNewPlayerId(pair[1]);
            transfers.add(t);
        }
        request.setTransfers(transfers);
        return request;
    }

    private Player findPlayerByName(String name) {
        return playerMap.values().stream()
            .filter(p -> p.getNameKicker().equals(name))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Player not found: " + name));
    }
}
