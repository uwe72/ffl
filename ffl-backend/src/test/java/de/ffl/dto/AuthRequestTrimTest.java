package de.ffl.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuthRequestTrimTest {

    @Test
    void loginRequest_trimsLogin() {
        LoginRequest request = new LoginRequest();
        request.setLogin("  Kanegoalski  ");
        assertThat(request.getLogin()).isEqualTo("Kanegoalski");
    }

    @Test
    void loginRequest_keepsPasswordUntrimmed() {
        LoginRequest request = new LoginRequest();
        request.setPassword("  secret  ");
        assertThat(request.getPassword()).isEqualTo("  secret  ");
    }

    @Test
    void registerRequest_trimsLoginAndProfileFieldsButNotPassword() {
        RegisterRequest request = new RegisterRequest();
        request.setLogin("  user123  ");
        request.setEmail("  user@test.de  ");
        request.setFirstName("  Max  ");
        request.setLastName("  Mustermann  ");
        request.setPassword("  pass  ");

        assertThat(request.getLogin()).isEqualTo("user123");
        assertThat(request.getEmail()).isEqualTo("user@test.de");
        assertThat(request.getFirstName()).isEqualTo("Max");
        assertThat(request.getLastName()).isEqualTo("Mustermann");
        assertThat(request.getPassword()).isEqualTo("  pass  ");
    }

    @Test
    void forgotPasswordRequest_trimsLogin() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setLogin("  Kanegoalski  ");
        assertThat(request.getLogin()).isEqualTo("Kanegoalski");
    }
}
