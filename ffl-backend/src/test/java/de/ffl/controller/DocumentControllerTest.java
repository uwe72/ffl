package de.ffl.controller;

import de.ffl.domain.Document;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.dto.DocumentDto;
import de.ffl.service.DocumentService;
import de.ffl.service.SeasonService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentControllerTest {

    @Mock
    private DocumentService documentService;

    @Mock
    private SeasonService seasonService;

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

        ResponseEntity<byte[]> response = documentController.getDocumentContent(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(4);
    }

    @Test
    void getDocumentContent_anonymous_runningSeason_returnsUnauthorized() {
        setAnonymous();
        mockSeasonState(SeasonState.RUNNING_RUECKRUNDE);

        ResponseEntity<byte[]> response = documentController.getDocumentContent(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void getPublicDocumentContent_knownToken_returnsOk() {
        Document doc = sampleEntity();
        doc.setShareToken("abc-123");
        when(documentService.findFileDataByShareToken("abc-123")).thenReturn(Optional.of(doc));

        ResponseEntity<byte[]> response = documentController.getPublicDocumentContent("abc-123");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(4);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(response.getHeaders().getFirst("Content-Disposition")).contains("inline");
    }

    @Test
    void getPublicDocumentContent_unknownToken_returnsNotFound() {
        when(documentService.findFileDataByShareToken("unknown")).thenReturn(Optional.empty());

        ResponseEntity<byte[]> response = documentController.getPublicDocumentContent("unknown");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
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
}
