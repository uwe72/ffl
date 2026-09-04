package de.ffl.service;

import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamChangeMailServiceTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private SpringTemplateEngine templateEngine;

    private TeamChangeMailService service() {
        return new TeamChangeMailService(systemConfigRepository, templateEngine);
    }

    private String render(boolean winterChange, int transferRound) {
        when(templateEngine.process(eq("mail/team-change-confirmation"), any(Context.class)))
                .thenAnswer(invocation -> {
                    Context ctx = invocation.getArgument(1);
                    return "count=" + ctx.getVariable("teamChangeCount")
                            + "|winterChange=" + ctx.getVariable("winterChange")
                            + "|transferRound=" + ctx.getVariable("transferRound");
                });

        return service().buildTeamChangeHtml(
                "Max", "Max Mustermann (mmustermann)", "2026/27", "Winterwechsel",
                List.of(), List.of(), null, "https://ffl.app",
                6, winterChange, transferRound, null, false, false);
    }

    @Test
    void buildHtml_winterChange_setsWinterChangeAndTransferRound() {
        String html = render(true, 18);

        assertThat(html).contains("count=6");
        assertThat(html).contains("winterChange=true");
        assertThat(html).contains("transferRound=18");
    }

    @Test
    void buildHtml_beforeSeason_setsWinterChangeFalse() {
        String html = render(false, 16);

        assertThat(html).contains("winterChange=false");
        assertThat(html).contains("transferRound=16");
    }
}
