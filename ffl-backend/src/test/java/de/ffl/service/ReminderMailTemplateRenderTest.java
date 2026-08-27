package de.ffl.service;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class ReminderMailTemplateRenderTest {

    private static SpringTemplateEngine engine;

    @BeforeAll
    static void setUp() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
    }

    private static Season season() {
        return Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .seasonStartDate(LocalDate.of(2026, 8, 14))
            .seasonStartTime(LocalTime.of(20, 30))
            .finalRegistrationDate(LocalDate.of(2026, 8, 14))
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .serverkostenEuro(new BigDecimal("60.00"))
            .gewinnErsterPlatzProzent(10)
            .gewinnLetzterPlatzEuro(new BigDecimal("15.00"))
            .anzahlSpielleiter(2)
            .build();
    }

    private static Context context(Season season, boolean registered) {
        Context ctx = new Context(Locale.GERMANY);
        ctx.setVariable("registered", registered);
        ctx.setVariable("recipientEmail", "spieler@example.com");
        ctx.setVariable("seasonName", season.getName());
        ctx.setVariable("anzahlManager", 123L);
        ctx.setVariable("startDateLong", "Freitag, 14. August 2026");
        ctx.setVariable("deadlineDate", "Freitag, 14. August 2026");
        ctx.setVariable("deadlineTime", "20:30");
        ctx.setVariable("spieleinsatz", "10");
        ctx.setVariable("serverkosten", "60");
        ctx.setVariable("gewinnProzent", "10");
        ctx.setVariable("gewinnLetzter", "15");
        ctx.setVariable("anzahlSpielleiter", "2");
        ctx.setVariable("budget", "30.000.000");
        ctx.setVariable("playersUrl", "https://ffl.example.com/players");
        ctx.setVariable("documentsUrl", "https://ffl.example.com/documents");
        ctx.setVariable("webUrl", "https://ffl.example.com");
        return ctx;
    }

    @Test
    void registeredVariant_repeatsInvitationContent_andHasNoZurFflButton() {
        Season season = season();
        String html = engine.process("mail/reminder", context(season, true));

        assertThat(html).contains("Danke für Deine Anmeldung");
        assertThat(html).contains("Einfach diese Mail weiterleiten.");
        assertThat(html).contains("Jetzt anmelden");
        assertThat(html).contains("Zur Anmeldung");
        assertThat(html).contains("Viel Erfolg");
        assertThat(html).contains("Spielregeln");
        assertThat(html).doesNotContain("Zur FFL");
        assertThat(html).doesNotContain("unter einer <strong>anderen E-Mail-Adresse</strong> angemeldet");
    }

    @Test
    void nonRegisteredVariant_hasNoInvitationRepeat() {
        Season season = season();
        String html = engine.process("mail/reminder", context(season, false));

        assertThat(html).contains("ist noch offen");
        assertThat(html).contains("August n&auml;chsten Jahres");
        assertThat(html).contains("unter einer <strong>anderen E-Mail-Adresse</strong> angemeldet");
        assertThat(html).contains("spieler@example.com");
        assertThat(html).doesNotContain("Einfach diese Mail weiterleiten.");
        assertThat(html).doesNotContain("Viel Erfolg");
    }

    @Test
    void invitationTemplate_stillRendersAfterFragmentExtraction() {
        Season season = season();
        String html = engine.process("mail/invitation", context(season, false));

        assertThat(html).contains("DIE NEUE SAISON RUFT");
        assertThat(html).contains("Jetzt anmelden");
        assertThat(html).contains("Spielregeln");
        assertThat(html).contains("Viel Erfolg");
        assertThat(html).contains("Einsatz");
    }
}
