package de.ffl.config;

import org.apache.catalina.connector.ClientAbortException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void badCredentials_returnsUnauthorizedWithFriendlyMessage() {
        ResponseEntity<String> response = handler.handleAuthenticationException(
            new BadCredentialsException("Bad credentials")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isEqualTo("Ungültiger Login oder Passwort");
    }

    @Test
    void clientAbort_handledWithoutException() {
        handler.handleClientAbortException(new ClientAbortException("Connection reset by peer"));
    }
}
