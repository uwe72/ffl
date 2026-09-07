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
    void genericException_returnsInternalServerErrorWithoutInternalDetails() {
        ResponseEntity<String> response = handler.handleGenericException(
            new RuntimeException("org.postgresql.util.PSQLException: SELECT * FROM ffl_user failed")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isEqualTo("Interner Serverfehler");
        assertThat(response.getBody()).doesNotContain("PSQLException");
        assertThat(response.getBody()).doesNotContain("SELECT");
    }

    @Test
    void illegalArgument_returnsBadRequestWithBusinessMessage() {
        ResponseEntity<String> response = handler.handleIllegalArgumentException(
            new IllegalArgumentException("Team value exceeds budget")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo("Team value exceeds budget");
    }

    @Test
    void clientAbort_handledWithoutException() {
        handler.handleClientAbortException(new ClientAbortException("Connection reset by peer"));
    }
}
