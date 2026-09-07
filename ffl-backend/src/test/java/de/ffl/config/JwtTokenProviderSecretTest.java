package de.ffl.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class JwtTokenProviderSecretTest {

    private JwtTokenProvider providerWithSecret(String secret) {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", secret);
        ReflectionTestUtils.setField(provider, "jwtExpiration", 3600000L);
        ReflectionTestUtils.setField(provider, "jwtRefreshExpiration", 2592000000L);
        return provider;
    }

    @Test
    void startBrichtAbWennSecretFehlt() {
        JwtTokenProvider provider = providerWithSecret("");

        assertThatExceptionOfType(IllegalStateException.class)
            .isThrownBy(provider::validateSecret)
            .withMessageContaining("APP_JWT_SECRET")
            .withMessageContaining("Compose File");
    }

    @Test
    void startBrichtAbWennSecretZuKurzIst() {
        JwtTokenProvider provider = providerWithSecret("zu-kurz-geheim");

        assertThatExceptionOfType(IllegalStateException.class)
            .isThrownBy(provider::validateSecret)
            .withMessageContaining("APP_JWT_SECRET")
            .withMessageContaining("Compose File")
            .withMessageNotContaining("zu-kurz-geheim");
    }

    @Test
    void gueltigesSecretErlaubtTokenRoundtrip() {
        JwtTokenProvider provider = providerWithSecret("test-secret-mit-mindestens-32-byte-laenge!!");

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
        Authentication auth = new UsernamePasswordAuthenticationToken("admin", null, authorities);

        String token = provider.generateToken(auth);

        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.getUsernameFromToken(token)).isEqualTo("admin");
        assertThat(provider.getRoleFromToken(token)).isEqualTo("ROLE_ADMIN");
    }
}
