package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.dto.*;
import de.ffl.repository.ManagerRankRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class DashboardServiceTest extends AbstractSeasonTestBase {

    @Autowired
    private DashboardService dashboardService;
    @Autowired
    private ManagerRankRepository managerRankRepository;

    @Test
    void aufstellung_liefertSaisonUndElfSpieler() {
        AufstellungDto dto = dashboardService.getAufstellung(managerUwe72.getId());

        assertThat(dto.getPhase()).isEqualTo("SAISON");
        assertThat(dto.getSpieltag()).isEqualTo(season.getCurrentMatchday());
        assertThat(dto.getTeamname()).isEqualTo(managerUwe72.getShortName());
        assertThat(dto.getBudget()).isEqualTo(season.getBudget());
        assertThat(dto.getSpieler()).hasSize(11);

        assertThat(dto.getSpieler()).allMatch(s -> s.getPunkteGesamt() >= 0);
        assertThat(dto.getSpieler()).allMatch(s -> s.getPunkteSpieltag() >= 0);
        assertThat(dto.getSpieler()).allMatch(s -> s.getMarktwert() != null && s.getMarktwert() > 0);
        assertThat(dto.getSpieler()).allMatch(s -> s.getPosition() != null);
        assertThat(dto.getSpieler()).allMatch(s -> s.getLastName() != null && !s.getLastName().isBlank());
        assertThat(dto.getSpieler()).allMatch(s -> s.getName().equals(s.getLastName()));
    }

    @Test
    void aufstellung_kaderwertIstSummeDerPreise() {
        AufstellungDto dto = dashboardService.getAufstellung(managerUwe72.getId());
        int expected = dto.getSpieler().stream().mapToInt(SpielerAufstellungDto::getMarktwert).sum();
        assertThat(dto.getKaderwert()).isEqualTo(expected);
    }

    @Test
    void aufstellung_jokerNurFuerFreieWahl() {
        AufstellungDto dto = dashboardService.getAufstellung(managerUwe72.getId());
        assertThat(dto.getSpieler()).filteredOn(SpielerAufstellungDto::getJoker).hasSize(1);
        assertThat(dto.getSpieler())
            .filteredOn(SpielerAufstellungDto::getJoker)
            .extracting(SpielerAufstellungDto::getId)
            .containsExactly(managerUwe72.getPlayerFreeChoice().getId());
    }

    @Test
    void rangliste_gesamt_liefertAusschnittMitEigenerZeile() {
        RanglisteDto dto = dashboardService.getRangliste(managerUwe72.getId(), 2, "gesamt");

        assertThat(dto.getPhase()).isEqualTo("SAISON");
        assertThat(dto.getTeilnehmer()).isEqualTo(managerRepository.findBySeasonId(season.getId()).size());
        assertThat(dto.getEintraege()).isNotEmpty();
        assertThat(dto.getEintraege().size()).isLessThanOrEqualTo(5);
        assertThat(dto.getEintraege()).anyMatch(RanglistenEintragDto::getIstIch);
    }

    @Test
    void rangliste_gesamt_platzEntsprichtPrecomputedRank() {
        int matchday = season.getCurrentMatchday();
        Optional<ManagerRank> rank = managerRankRepository.findByManagerIdAndRoundNumber(managerUwe72.getId(), matchday);
        assertThat(rank).isPresent();

        RanglisteDto dto = dashboardService.getRangliste(managerUwe72.getId(), 2, "gesamt");
        RanglistenEintragDto own = dto.getEintraege().stream()
            .filter(RanglistenEintragDto::getIstIch)
            .findFirst()
            .orElseThrow();

        assertThat(own.getPlatz()).isEqualTo(rank.get().getPositionTotal());
        assertThat(own.getPunkteGesamt()).isEqualTo(rank.get().getPointsTotal());
    }

    @Test
    void rangliste_modusSpieltag_sortiertNachSpieltagspunkten() {
        RanglisteDto gesamt = dashboardService.getRangliste(managerUwe72.getId(), 2, "gesamt");
        RanglisteDto spieltag = dashboardService.getRangliste(managerUwe72.getId(), 2, "spieltag");

        assertThat(spieltag.getEintraege()).isNotEmpty();
        assertThat(gesamt.getAbstandZuPlatzEins()).isNotNull();
        assertThat(spieltag.getAbstandZuPlatzEins()).isNotNull();
    }

    @Test
    void rangliste_preisgeldGrenzeIstZehnProzentAufgerundet() {
        RanglisteDto dto = dashboardService.getRangliste(managerUwe72.getId(), 2, "gesamt");
        int expected = (int) Math.ceil(dto.getTeilnehmer() * 0.10);
        assertThat(dto.getPreisgeldGrenzePlatz()).isEqualTo(expected);
    }

    @Test
    void vorsaison_aufstellung_liefertMarktwerteUndKeinePunkte() {
        Season vsSeason = Season.builder()
            .name("Vorsaison Test")
            .budget(30000000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .currentMatchday(0)
            .build();
        vsSeason = seasonRepository.save(vsSeason);

        User user = User.builder()
            .login("vorsaison-manager")
            .password("$2a$10$test")
            .email("vorsaison@test.de")
            .firstName("Vor")
            .lastName("Saison")
            .role(UserRole.NORMAL)
            .build();
        user = userRepository.save(user);

        List<Player> all = new java.util.ArrayList<>(playerMap.values());
        Manager m = Manager.builder()
            .user(user)
            .season(vsSeason)
            .budget(30000000)
            .playerGoalkeeper(all.get(0))
            .playerDefender1(all.get(1))
            .playerDefender2(all.get(2))
            .playerDefender3(all.get(3))
            .playerMidfield1(all.get(4))
            .playerMidfield2(all.get(5))
            .playerMidfield3(all.get(6))
            .playerStriker1(all.get(7))
            .playerStriker2(all.get(8))
            .playerStriker3(all.get(9))
            .playerFreeChoice(all.get(10))
            .build();
        m = managerRepository.save(m);

        AufstellungDto dto = dashboardService.getAufstellung(m.getId());

        assertThat(dto.getPhase()).isEqualTo("VORSAISON");
        assertThat(dto.getSpieler()).hasSize(11);
        assertThat(dto.getSpieler()).allMatch(s -> s.getPunkteGesamt() == 0);
        assertThat(dto.getSpieler()).allMatch(s -> s.getPunkteSpieltag() == 0);
        assertThat(dto.getKaderwert()).isEqualTo(
            dto.getSpieler().stream().mapToInt(SpielerAufstellungDto::getMarktwert).sum());

        RanglisteDto rang = dashboardService.getRangliste(m.getId(), 2, "gesamt");
        assertThat(rang.getPhase()).isEqualTo("VORSAISON");
        assertThat(rang.getVerteilung()).isNotNull();
        assertThat(rang.getVerteilung()).isNotEmpty();
        assertThat(rang.getEigenerWert()).isEqualTo(dto.getKaderwert());
        assertThat(rang.getEintraege()).isNullOrEmpty();
    }
}
