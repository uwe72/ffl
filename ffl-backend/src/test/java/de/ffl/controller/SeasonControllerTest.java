package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.BestTeamService;
import de.ffl.service.DepositService;
import de.ffl.service.DocumentService;
import de.ffl.service.InvitationMailService;
import de.ffl.service.PlayerPdfService;
import de.ffl.service.PrizeDistributionMailService;
import de.ffl.service.PrizeDistributionService;
import de.ffl.service.ReminderMailService;
import de.ffl.service.SeasonReportMailService;
import de.ffl.service.SeasonService;
import de.ffl.service.SeasonTransparencyMailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeasonControllerTest {

    @Mock
    private SeasonRepository seasonRepository;

    @Mock
    private SeasonService seasonService;

    @Mock
    private BestTeamService bestTeamService;

    @Mock
    private PrizeDistributionService prizeDistributionService;

    @Mock
    private PrizeDistributionMailService prizeDistributionMailService;

    @Mock
    private InvitationMailService invitationMailService;

    @Mock
    private ReminderMailService reminderMailService;

    @Mock
    private SeasonReportMailService seasonReportMailService;

    @Mock
    private SeasonTransparencyMailService seasonTransparencyMailService;

    @Mock
    private DocumentService documentService;

    @Mock
    private PlayerPdfService playerPdfService;

    @Mock
    private DepositService depositService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SeasonController seasonController;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authAs(String role) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("user", "pw",
                List.of(new SimpleGrantedAuthority(role))));
    }

    private Season seasonWithSensitiveData() {
        return Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(1000)
            .seasonState(SeasonState.RUNNING_HINRUNDE)
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .paypalLink("https://paypal.me/ffl")
            .bankName("Sparkasse")
            .iban("DE02120300000000202051")
            .bic("BYLADEM1001")
            .kontoinhaber("Uwe Clement")
            .adminFallbackUser("uwe72")
            .mailText("intern")
            .invitationMailText("intern")
            .invitationMailSubject("intern")
            .build();
    }

    @Test
    void getCurrentSeason_nonAdmin_sensitiveFieldsAreCleared() {
        authAs("ROLE_USER");
        when(seasonRepository.findAll()).thenReturn(List.of(seasonWithSensitiveData()));
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(
            User.builder().id(7L).login("user").role(UserRole.NORMAL).build()));

        ResponseEntity<Season> response = seasonController.getCurrentSeason();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        Season body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getId()).isEqualTo(1L);
        assertThat(body.getName()).isEqualTo("2026/27");
        assertThat(body.getSeasonState()).isEqualTo(SeasonState.RUNNING_HINRUNDE);
        assertThat(body.getPaypalLink()).isNull();
        assertThat(body.getBankName()).isNull();
        assertThat(body.getIban()).isNull();
        assertThat(body.getBic()).isNull();
        assertThat(body.getKontoinhaber()).isNull();
        assertThat(body.getAdminFallbackUser()).isNull();
        assertThat(body.getMailText()).isNull();
        assertThat(body.getInvitationMailText()).isNull();
        assertThat(body.getInvitationMailSubject()).isNull();
    }

    @Test
    void getCurrentSeason_admin_sensitiveFieldsAreKept() {
        authAs("ROLE_ADMIN");
        when(seasonRepository.findAll()).thenReturn(List.of(seasonWithSensitiveData()));
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(
            User.builder().id(1L).login("user").role(UserRole.ADMIN).build()));

        ResponseEntity<Season> response = seasonController.getCurrentSeason();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        Season body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getIban()).isEqualTo("DE02120300000000202051");
        assertThat(body.getPaypalLink()).isEqualTo("https://paypal.me/ffl");
        assertThat(body.getAdminFallbackUser()).isEqualTo("uwe72");
    }

    @Test
    void getAllSeasons_nonAdmin_sensitiveFieldsAreCleared() {
        authAs("ROLE_USER");
        when(seasonRepository.findAll()).thenReturn(List.of(seasonWithSensitiveData()));
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(
            User.builder().id(7L).login("user").role(UserRole.NORMAL).build()));

        List<Season> result = seasonController.getAllSeasons();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getIban()).isNull();
        assertThat(result.get(0).getPaypalLink()).isNull();
        assertThat(result.get(0).getKontoinhaber()).isNull();
    }

    @Test
    void getSeasonById_nonAdmin_sensitiveFieldsAreCleared() {
        authAs("ROLE_USER");
        when(seasonRepository.findById(1L)).thenReturn(Optional.of(seasonWithSensitiveData()));
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(
            User.builder().id(7L).login("user").role(UserRole.NORMAL).build()));

        ResponseEntity<Season> response = seasonController.getSeasonById(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getIban()).isNull();
        assertThat(response.getBody().getMailText()).isNull();
    }

    @Test
    void getCurrentSeason_anonymous_sensitiveFieldsAreCleared() {
        SecurityContextHolder.clearContext();
        when(seasonRepository.findAll()).thenReturn(List.of(seasonWithSensitiveData()));

        ResponseEntity<Season> response = seasonController.getCurrentSeason();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getIban()).isNull();
    }
}
