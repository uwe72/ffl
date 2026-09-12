package de.ffl.service;

import de.ffl.repository.GameRepository;
import de.ffl.repository.PlayerRepository;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class FormationConverterServiceTest {

    private final FormationConverterService service =
        new FormationConverterService(mock(GameRepository.class), mock(PlayerRepository.class));

    private static final List<String> UNION_STARTERS = List.of(
        "Rönnow", "Juranovic", "Querfeld", "Uduokhai", "Rothe", "Aebischer",
        "Kemlein", "Jeong", "R. Khedira", "Burcu", "Latte Lath");

    private static final List<String> SCHALKE_STARTERS = List.of(
        "Karius", "T. Becker", "Katic", "Kurucay", "Ljubicic", "El-Faouzi",
        "Tanaka", "Gosens", "Karaman", "Aouchiche", "Adamu");

    private static final String GAME_TWO_COLUMN_WECHSEL_FORMAT = """
        Tore
        0
        :
        1
        25'
        Gosens
        Linksschuss
        0
        :
        2
        46'
        Aouchiche
        Rechtsschuss, Adamu
        Skarke
        Rechtsschuss, Rothe
        90'
        +6
        1
        :
        2
        1
        :
        3
        90'
        +13
        Wöber
        Linksschuss, H.-C. Hwang
        Besondere Vorkommnisse
        Schiedsrichter Gerach wurde wegen einer Verletzung durch den 4. Offiziellen Wienefeld ersetzt (68.).

        Aufstellung
        Rönnow
        Juranovic
        Querfeld
        Uduokhai
        Rothe
        Aebischer
        Kemlein
        Jeong
        R. Khedira
        Burcu
        Latte Lath
        Karius
        T. Becker
        Katic
        Kurucay
        Ljubicic
        El-Faouzi
        Tanaka
        Gosens
        Karaman
        Aouchiche
        Adamu
        Trainer
        Lustrinelli
        Muslic

        Wechsel
        Ljubicic
        46'
        Burcu
        Schäfer
        46'
        Kemlein
        Skarke
        76'
        Latte Lath
        Haberer
        85'
        Aebischer
        Skov
        90' +1
        Jeong
        Dina Ebimbe
        21'
        Ljubicic
        Dzeko
        80'
        Karaman
        H.-C. Hwang
        80'
        Adamu
        Wöber
        80'
        Gosens
        Bachmann
        90' +3
        Aouchiche
        """;

    private static final String GAME_IN_MINUTE_OUT_FORMAT = """
        Tore
        Avdullahu
        Rechtsschuss, Coufal
        45'
        1
        :
        0
        Lemperle
        Rechtsschuss, Daghim
        54'
        2
        :
        0
        2
        :
        1
        61'
        Guirassy
        Rechtsschuss, Anton
        2
        :
        2
        66'
        Fabio Silva
        Linksschuss, Guirassy
        2
        :
        3
        87'
        Hajdari (Eigentor)
        Rechtsschuss, Nwaneri
        Aufstellung
        Baumann3,0
        Coufal3,0
        Kabak2,5
        Hajdari5,0
        M. Rots3,0
        Avdullahu2,0
        Burger3,0
        Wimmer4,0
        Daghim2,5
        Lemperle1,5
        Hlozek3,0
        Kobel3,0
        Gadou5,5
        Anton2,5
        Mane3,5
        Ryerson3,5
        Bellingham4,0
        F. Nmecha5,0
        Svensson3,5
        Karetsas4,0
        Beier4,5
        Guirassy1,5
        Trainer
        Ilzer
        Kovac

        Wechsel
        Kramaric
        73'
        Hlozek3,0
        Conté
        73'
        Wimmer4,0
        Hranac
        79'
        Kabak2,5
        De Cat
        79'
        Burger3,0
        Moerstedt
        84'
        Lemperle1,5
        Nwaneri3,0
        32'
        Mane3,5
        J. Veerman3,5
        46'
        F. Nmecha5,0
        Fabio Silva2,0
        62'
        Karetsas4,0
        Reggiani4,0
        62'
        Gadou5,5
        Sabitzer
        87'
        Guirassy1,5
        """;

    private static final String GAME_EIGHT_SUBSTITUTIONS = """
        Aufstellung
        HeimA
        HeimB
        HeimC
        HeimD
        HeimE
        HeimF
        HeimG
        HeimH
        HeimI
        HeimJ
        HeimK
        GastA
        GastB
        GastC
        GastD
        GastE
        GastF
        GastG
        GastH
        GastI
        GastJ
        GastK
        Trainer
        CoachA
        CoachB

        Wechsel
        SubA
        60'
        HeimA
        SubB
        60'
        HeimB
        SubC
        60'
        HeimC
        SubD
        60'
        HeimD
        SubE
        60'
        HeimE
        SubF
        60'
        HeimF
        SubG
        60'
        HeimG
        SubH
        60'
        HeimH
        """;

    private static final String GAME_WITHOUT_WECHSEL = """
        Aufstellung
        HeimA
        HeimB
        HeimC
        HeimD
        HeimE
        HeimF
        HeimG
        HeimH
        HeimI
        HeimJ
        HeimK
        GastA
        GastB
        GastC
        GastD
        GastE
        GastF
        GastG
        GastH
        GastI
        GastJ
        GastK
        Trainer
        CoachA
        CoachB
        """;

    @Test
    void validateFormation_twoColumnWechselFormat_withoutRosters_fallsBackToFirstShiftWithinLimit() {
        String intern = service.convertToIntern(GAME_TWO_COLUMN_WECHSEL_FORMAT);

        FormationConverterService.ValidationResult result = service.validateFormation(intern);

        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getHostPlayerCount()).isEqualTo(16);
        assertThat(result.getVisitorPlayerCount()).isEqualTo(15);
    }

    @Test
    void findExchangePlayers_twoColumnWechselFormat_resolvesCorrectSubstitutes() {
        String intern = service.convertToIntern(GAME_TWO_COLUMN_WECHSEL_FORMAT);
        Set<String> hostRoster = new HashSet<>(UNION_STARTERS);
        hostRoster.addAll(List.of("Schäfer", "Skarke", "Haberer", "Skov"));
        Set<String> visitorRoster = new HashSet<>(SCHALKE_STARTERS);
        visitorRoster.addAll(List.of("Dina Ebimbe", "Dzeko", "H.-C. Hwang", "Wöber", "Bachmann"));

        FormationConverterService.ExchangeSubstitutions substitutions =
            service.findExchangePlayers(intern, List.of(), List.of(), hostRoster, visitorRoster);

        assertThat(substitutions.getHostPlayers())
            .containsExactly("Schäfer", "Skarke", "Haberer", "Skov");
        assertThat(substitutions.getVisitorPlayers())
            .containsExactly("Dina Ebimbe", "Dzeko", "H.-C. Hwang", "Wöber", "Bachmann");
    }

    @Test
    void validateFormation_twoColumnWechselFormat_withRosters_assignsSubstitutionsToCorrectTeams() {
        String intern = service.convertToIntern(GAME_TWO_COLUMN_WECHSEL_FORMAT);
        Set<String> hostRoster = new HashSet<>(UNION_STARTERS);
        hostRoster.addAll(List.of("Schäfer", "Skarke", "Haberer", "Skov"));
        Set<String> visitorRoster = new HashSet<>(SCHALKE_STARTERS);
        visitorRoster.addAll(List.of("Dina Ebimbe", "Dzeko", "H.-C. Hwang", "Wöber", "Bachmann"));

        FormationConverterService.ValidationResult result = service.validateFormation(intern, hostRoster, visitorRoster);

        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getHostPlayerCount()).isEqualTo(15);
        assertThat(result.getVisitorPlayerCount()).isEqualTo(16);
    }

    @Test
    void validateFormation_inOutMinuteFormat_stillParsesAllTenSubstitutions() {
        String intern = service.convertToIntern(GAME_IN_MINUTE_OUT_FORMAT);

        FormationConverterService.ValidationResult result = service.validateFormation(intern);

        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getHostPlayerCount()).isEqualTo(16);
        assertThat(result.getVisitorPlayerCount()).isEqualTo(16);
    }

    @Test
    void findExchangePlayers_inOutMinuteFormat_resolvesCorrectSubstitutes() {
        String intern = service.convertToIntern(GAME_IN_MINUTE_OUT_FORMAT);

        FormationConverterService.ExchangeSubstitutions substitutions =
            service.findExchangePlayers(intern, List.of(), List.of());

        assertThat(substitutions.getHostPlayers())
            .containsExactly("Kramaric", "Conté", "Hranac", "De Cat", "Moerstedt");
        assertThat(substitutions.getVisitorPlayers())
            .containsExactly("Nwaneri", "J. Veerman", "Fabio Silva", "Reggiani", "Sabitzer");
    }

    @Test
    void findExchangePlayers_inOutMinuteFormat_withRosters_keepsShiftZeroAssignment() {
        String intern = service.convertToIntern(GAME_IN_MINUTE_OUT_FORMAT);
        Set<String> hostRoster = new HashSet<>(List.of(
            "Baumann", "Coufal", "Kabak", "Hajdari", "M. Rots", "Avdullahu", "Burger", "Wimmer",
            "Daghim", "Lemperle", "Hlozek", "Kramaric", "Conté", "Hranac", "De Cat", "Moerstedt"));
        Set<String> visitorRoster = new HashSet<>(List.of(
            "Kobel", "Gadou", "Anton", "Mane", "Ryerson", "Bellingham", "F. Nmecha", "Svensson",
            "Karetsas", "Beier", "Guirassy", "Nwaneri", "J. Veerman", "Fabio Silva", "Reggiani", "Sabitzer"));

        FormationConverterService.ExchangeSubstitutions substitutions =
            service.findExchangePlayers(intern, List.of(), List.of(), hostRoster, visitorRoster);

        assertThat(substitutions.getHostPlayers())
            .containsExactly("Kramaric", "Conté", "Hranac", "De Cat", "Moerstedt");
        assertThat(substitutions.getVisitorPlayers())
            .containsExactly("Nwaneri", "J. Veerman", "Fabio Silva", "Reggiani", "Sabitzer");
    }

    @Test
    void validateFormation_moreThanFiveSubstitutions_reportsError() {
        String intern = service.convertToIntern(GAME_EIGHT_SUBSTITUTIONS);

        FormationConverterService.ValidationResult result = service.validateFormation(intern);

        assertThat(result.getErrors())
            .containsExactly("Heim-Mannschaft hat 8 statt max. 5 Auswechselspieler");
    }

    @Test
    void validateFormation_withoutWechselSection_countsOnlyStarters() {
        String intern = service.convertToIntern(GAME_WITHOUT_WECHSEL);

        FormationConverterService.ValidationResult result = service.validateFormation(intern);

        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getHostPlayerCount()).isEqualTo(11);
        assertThat(result.getVisitorPlayerCount()).isEqualTo(11);
    }
}
