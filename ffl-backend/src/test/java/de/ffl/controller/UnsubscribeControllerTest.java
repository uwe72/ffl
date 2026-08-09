package de.ffl.controller;

import de.ffl.domain.EmailAddress;
import de.ffl.service.UnsubscribeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnsubscribeControllerTest {

    @Mock
    private UnsubscribeService unsubscribeService;

    @InjectMocks
    private UnsubscribeController unsubscribeController;

    private static final Long ID = 5L;
    private static final String TOKEN = "abc.def";
    private static final String EMAIL = "user@example.com";

    @Test
    void showConfirmation_validToken_returnsConfirmationPage() {
        when(unsubscribeService.validateToken(ID, TOKEN)).thenReturn(true);
        when(unsubscribeService.findEmailById(ID)).thenReturn(Optional.of(
            EmailAddress.builder().id(ID).email(EMAIL).build()));

        ResponseEntity<String> response = unsubscribeController.showConfirmation(ID, TOKEN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Ja, austragen");
        assertThat(response.getBody()).contains(EMAIL);
    }

    @Test
    void showConfirmation_validToken_containsCancelButtonWithWebUrl() {
        when(unsubscribeService.validateToken(ID, TOKEN)).thenReturn(true);
        when(unsubscribeService.findEmailById(ID)).thenReturn(Optional.of(
            EmailAddress.builder().id(ID).email(EMAIL).build()));
        when(unsubscribeService.getWebUrl()).thenReturn("https://ffl.example.com");

        ResponseEntity<String> response = unsubscribeController.showConfirmation(ID, TOKEN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Abbrechen");
        assertThat(response.getBody()).contains("btn-secondary");
        assertThat(response.getBody()).contains("https://ffl.example.com");
    }

    @Test
    void showConfirmation_invalidToken_returnsErrorPage() {
        when(unsubscribeService.validateToken(ID, TOKEN)).thenReturn(false);

        ResponseEntity<String> response = unsubscribeController.showConfirmation(ID, TOKEN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Ungültiger oder abgelaufener Link");
    }

    @Test
    void showConfirmation_alreadyUnsubscribed_returnsAlreadyUnsubscribedPage() {
        when(unsubscribeService.validateToken(ID, TOKEN)).thenReturn(true);
        when(unsubscribeService.findEmailById(ID)).thenReturn(Optional.empty());

        ResponseEntity<String> response = unsubscribeController.showConfirmation(ID, TOKEN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("bereits ausgetragen");
    }

    @Test
    void confirmUnsubscribe_validToken_unsubscribesAndReturnsSuccessPage() {
        when(unsubscribeService.validateToken(ID, TOKEN)).thenReturn(true);
        when(unsubscribeService.findEmailById(ID)).thenReturn(Optional.of(
            EmailAddress.builder().id(ID).email(EMAIL).build()));

        ResponseEntity<String> response = unsubscribeController.confirmUnsubscribe(ID, TOKEN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Erfolgreich ausgetragen");
        assertThat(response.getBody()).contains(EMAIL);
        verify(unsubscribeService).unsubscribe(ID);
    }

    @Test
    void confirmUnsubscribe_invalidToken_returnsErrorPageAndDoesNotUnsubscribe() {
        when(unsubscribeService.validateToken(ID, TOKEN)).thenReturn(false);

        ResponseEntity<String> response = unsubscribeController.confirmUnsubscribe(ID, TOKEN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Ungültiger oder abgelaufener Link");
        verify(unsubscribeService, org.mockito.Mockito.never()).unsubscribe(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void confirmUnsubscribe_alreadyUnsubscribed_returnsSuccessWithoutCallingUnsubscribe() {
        when(unsubscribeService.validateToken(ID, TOKEN)).thenReturn(true);
        when(unsubscribeService.findEmailById(ID)).thenReturn(Optional.empty());

        ResponseEntity<String> response = unsubscribeController.confirmUnsubscribe(ID, TOKEN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Erfolgreich ausgetragen");
        verify(unsubscribeService, org.mockito.Mockito.never()).unsubscribe(org.mockito.ArgumentMatchers.any());
    }
}
