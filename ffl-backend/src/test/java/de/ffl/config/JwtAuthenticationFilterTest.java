package de.ffl.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private UserDetailsService userDetailsService;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(tokenProvider, userDetailsService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void stubValidToken(String token, String login) {
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getUsernameFromToken(token)).thenReturn(login);
        when(userDetailsService.loadUserByUsername(login)).thenReturn(
            new User(login, "pw", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    @Test
    void queryTokenAufWhitelistedPfadWirdAkzeptiert() throws Exception {
        stubValidToken("abc", "admin");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/seasons/5/calculate-stream");
        request.setParameter("token", "abc");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("admin");
    }

    @Test
    void queryTokenAufSseMailPfadWirdAkzeptiert() throws Exception {
        stubValidToken("abc", "admin");
        MockHttpServletRequest request = new MockHttpServletRequest("GET",
            "/api/seasons/2/prize-distribution/mail/stream");
        request.setParameter("token", "abc");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void queryTokenAufNichtWhitelistedPfadWirdAbgelehnt() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/managers");
        request.setParameter("token", "abc");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        verify(tokenProvider, never()).validateToken(anyString());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void queryTokenAufÄhnlichemPfadRutschtNichtInDiePositivliste() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET",
            "/api/seasons/5/calculate-stream/other");
        request.setParameter("token", "abc");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        verify(tokenProvider, never()).validateToken(anyString());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void headerTokenFunktioniertWeiterhinAufBeliebigemPfad() throws Exception {
        stubValidToken("abc", "admin");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/managers");
        request.addHeader("Authorization", "Bearer abc");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("admin");
    }
}
