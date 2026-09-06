package de.ffl.controller;

import de.ffl.domain.Document;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.dto.DocumentDto;
import de.ffl.repository.UserRepository;
import de.ffl.service.DocumentDownloadTrackingService;
import de.ffl.service.DocumentService;
import de.ffl.service.DownloadStatisticsService;
import de.ffl.service.SeasonService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentControllerTest {

    @Mock
    private DocumentService documentService;

    @Mock
    private SeasonService seasonService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DownloadStatisticsService downloadStatisticsService;

    @Mock
    private DocumentDownloadTrackingService documentDownloadTrackingService;

    @InjectMocks
    private DocumentController documentController;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void setAnonymous() {
        SecurityContextHolder.getContext().setAuthentication(
            new AnonymousAuthenticationToken("key", "anonymousUser",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
    }

    private void setAuthenticated() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("user", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }

    private void mockSeasonState(SeasonState state) {
        Season season = Season.builder().id(1L).name("2026/27").seasonState(state).build();
        lenient().when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season));
    }

    private DocumentDto sampleDto() {
        DocumentDto dto = new DocumentDto();
        dto.setId(1L);
        dto.setFilename("regeln.pdf");
        dto.setContentType("application/pdf");
        dto.setFileSize(1234L);
        dto.setUploadedAt(Instant.now().toString());
        dto.setUploadedBy("admin");
        return dto;
    }

    private Document sampleEntity() {
        return Document.builder()
            .id(1L)
            .filename("regeln.pdf")
            .contentType("application/pdf")
            .fileSize(4L)
            .uploadedAt(Instant.now())
            .uploadedBy("admin")
            .data(new byte[]{1, 2, 3, 4})
            .build();
    }

    @Test
    void getAllDocuments_anonymous_beforeSeason_returnsOk() {
        setAnonymous();
        mockSeasonState(SeasonState.BEFORE_SEASON);
        when(documentService.findAll()).thenReturn(List.of(sampleDto()));

        ResponseEntity<List<DocumentDto>> response = documentController.getAllDocuments();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void getAllDocuments_anonymous_runningSeason_returnsUnauthorized() {
        setAnonymous();
        mockSeasonState(SeasonState.RUNNING_HINRUNDE);

        ResponseEntity<List<DocumentDto>> response = documentController.getAllDocuments();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void getAllDocuments_anonymous_noSeason_returnsUnauthorized() {
        setAnonymous();
        when(seasonService.findCurrentSeason()).thenReturn(Optional.empty());

        ResponseEntity<List<DocumentDto>> response = documentController.getAllDocuments();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void getAllDocuments_authenticated_runningSeason_returnsOk() {
        setAuthenticated();
        when(documentService.findAll()).thenReturn(List.of(sampleDto()));

        ResponseEntity<List<DocumentDto>> response = documentController.getAllDocuments();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void getDocumentContent_anonymous_beforeSeason_returnsOk() {
        setAnonymous();
        mockSeasonState(SeasonState.BEFORE_SEASON);
        when(documentService.findFileData(1L)).thenReturn(Optional.of(sampleEntity()));

        ResponseEntity<byte[]> response = documentController.getDocumentContent(1L, new MockHttpServletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(4);
        verify(downloadStatisticsService).recordDownload(isNull(), eq("regeln.pdf"));
    }

    @Test
    void getDocumentContent_authenticated_runningSeason_recordsDownloadWithUser() {
        setAuthenticated();
        when(documentService.findFileData(1L)).thenReturn(Optional.of(sampleEntity()));
        User user = User.builder().id(7L).login("user").build();
        when(userRepository.findByLoginIgnoreCase("user")).thenReturn(Optional.of(user));

        ResponseEntity<byte[]> response = documentController.getDocumentContent(1L, new MockHttpServletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(downloadStatisticsService).recordDownload(eq(user), eq("regeln.pdf"));
    }

    @Test
    void getDocumentContent_unknownDocument_doesNotRecordDownload() {
        setAuthenticated();
        when(documentService.findFileData(999L)).thenReturn(Optional.empty());

        ResponseEntity<byte[]> response = documentController.getDocumentContent(999L, new MockHttpServletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(downloadStatisticsService, never()).recordDownload(isNull(), eq("regeln.pdf"));
    }

    @Test
    void getDocumentContent_anonymous_runningSeason_returnsUnauthorized() {
        setAnonymous();
        mockSeasonState(SeasonState.RUNNING_RUECKRUNDE);

        ResponseEntity<byte[]> response = documentController.getDocumentContent(1L, new MockHttpServletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void getDocumentById_anonymous_runningSeason_returnsUnauthorized() {
        setAnonymous();
        mockSeasonState(SeasonState.RUNNING_HINRUNDE);

        ResponseEntity<DocumentDto> response = documentController.getDocumentById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void getDocumentById_authenticated_runningSeason_returnsOk() {
        setAuthenticated();
        when(documentService.findById(1L)).thenReturn(sampleDto());

        ResponseEntity<DocumentDto> response = documentController.getDocumentById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void updateDocumentDescription_success_returnsUpdatedDto() {
        setAuthenticated();
        DocumentDto updated = sampleDto();
        updated.setDescription("Neue Beschreibung");
        when(documentService.updateDescription(1L, "Neue Beschreibung")).thenReturn(updated);

        ResponseEntity<?> response = documentController.updateDocumentDescription(1L,
            Map.of("description", "Neue Beschreibung"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(DocumentDto.class);
        assertThat(((DocumentDto) response.getBody()).getDescription()).isEqualTo("Neue Beschreibung");
    }

    @Test
    void updateDocumentDescription_notFound_returnsNotFound() {
        setAuthenticated();
        when(documentService.updateDescription(999L, "x"))
            .thenThrow(new NoSuchElementException("Dokument nicht gefunden"));

        ResponseEntity<?> response = documentController.updateDocumentDescription(999L,
            Map.of("description", "x"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void updateDocumentDescription_invalidDescription_returnsBadRequest() {
        setAuthenticated();
        when(documentService.updateDescription(1L, "x".repeat(81)))
            .thenThrow(new IllegalArgumentException("Beschreibung darf maximal 80 Zeichen lang sein"));

        ResponseEntity<?> response = documentController.updateDocumentDescription(1L,
            Map.of("description", "x".repeat(81)));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo("Beschreibung darf maximal 80 Zeichen lang sein");
    }
}
