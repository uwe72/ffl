package de.ffl.controller;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.UserRepository;
import de.ffl.service.VisitStatisticsService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisitControllerTest {

    @Mock
    private VisitStatisticsService visitStatisticsService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VisitController visitController;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordVisit_normalUser_recordsVisit() {
        User user = User.builder().login("alice").role(UserRole.NORMAL).build();
        when(userRepository.findByLoginIgnoreCase("alice")).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext()
            .setAuthentication(new UsernamePasswordAuthenticationToken("alice", null, java.util.Collections.emptyList()));

        ResponseEntity<Void> response = visitController.recordVisit();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(visitStatisticsService).recordVisit(user);
    }

    @Test
    void recordVisit_adminUser_doesNotRecordVisit() {
        User user = User.builder().login("uwe72").role(UserRole.ADMIN).build();
        when(userRepository.findByLoginIgnoreCase("uwe72")).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext()
            .setAuthentication(new UsernamePasswordAuthenticationToken("uwe72", null, java.util.Collections.emptyList()));

        ResponseEntity<Void> response = visitController.recordVisit();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(visitStatisticsService, never()).recordVisit(any());
    }

    @Test
    void recordVisit_anonymous_returnsUnauthorized() {
        ResponseEntity<Void> response = visitController.recordVisit();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(visitStatisticsService, never()).recordVisit(any());
    }
}
