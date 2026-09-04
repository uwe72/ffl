package de.ffl.controller;

import de.ffl.domain.SeasonState;
import de.ffl.dto.DocumentDto;
import de.ffl.service.DocumentService;
import de.ffl.service.SeasonService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final SeasonService seasonService;

    public DocumentController(DocumentService documentService, SeasonService seasonService) {
        this.documentService = documentService;
        this.seasonService = seasonService;
    }

    @GetMapping
    public ResponseEntity<List<DocumentDto>> getAllDocuments() {
        if (isDocumentsAccessDenied()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(documentService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDto> getDocumentById(@PathVariable Long id) {
        if (isDocumentsAccessDenied()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        DocumentDto doc = documentService.findById(id);
        if (doc == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(doc);
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<byte[]> getDocumentContent(@PathVariable Long id) {
        if (isDocumentsAccessDenied()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return documentService.findFileData(id)
            .map(doc -> ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" + URLEncoder.encode(doc.getFilename(), StandardCharsets.UTF_8) + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(doc.getData()))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "description", required = false) String description) {
        try {
            String uploaderLogin = getCurrentLogin();
            DocumentDto created = documentService.upload(file, uploaderLogin, description);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Fehler beim Hochladen: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateDocumentDescription(@PathVariable Long id,
                                                       @RequestBody(required = false) Map<String, String> body) {
        try {
            String description = body != null ? body.get("description") : null;
            return ResponseEntity.ok(documentService.updateDescription(id, description));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        try {
            documentService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String getCurrentLogin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return "unknown";
        }
        return auth.getName();
    }

    private boolean isAnonymous() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal());
    }

    private boolean isDocumentsAccessDenied() {
        if (!isAnonymous()) {
            return false;
        }
        return seasonService.findCurrentSeason()
            .map(season -> season.getSeasonState() != SeasonState.BEFORE_SEASON)
            .orElse(true);
    }
}
