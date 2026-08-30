package de.ffl.controller;

import de.ffl.dto.ForgotLoginRequest;
import de.ffl.service.PasswordResetService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthControllerForgotLoginTest {

    private final PasswordResetService passwordResetService = mock(PasswordResetService.class);

    private AuthController controllerWithPasswordResetService() {
        return new AuthController(
            null, null, null, null, null, null, null, null, null, null,
            passwordResetService, null, null, null
        );
    }

    @Test
    void forgotLogin_existingEmail_returnsGenericMessageAndDelegatesToService() {
        when(passwordResetService.requestLoginReminder("user@test.de")).thenReturn(true);
        ForgotLoginRequest request = new ForgotLoginRequest();
        request.setEmail("user@test.de");

        ResponseEntity<?> response = controllerWithPasswordResetService().forgotLogin(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(Map.class);
        assertThat(((Map<?, ?>) response.getBody()).get("message"))
            .isEqualTo("Falls ein Konto mit dieser E-Mail-Adresse existiert, wurden die Login-Namen an diese Adresse gesendet.");
        verify(passwordResetService).requestLoginReminder("user@test.de");
    }

    @Test
    void forgotLogin_unknownEmail_returnsSameGenericMessageToAvoidEnumeration() {
        when(passwordResetService.requestLoginReminder("none@test.de")).thenReturn(false);
        ForgotLoginRequest request = new ForgotLoginRequest();
        request.setEmail("none@test.de");

        ResponseEntity<?> response = controllerWithPasswordResetService().forgotLogin(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Map<?, ?>) response.getBody()).get("message"))
            .isEqualTo("Falls ein Konto mit dieser E-Mail-Adresse existiert, wurden die Login-Namen an diese Adresse gesendet.");
    }
}
