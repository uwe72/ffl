package de.ffl.controller;

import de.ffl.service.DocumentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/public")
public class PublicDocumentController {

    private final DocumentService documentService;

    public PublicDocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/documents/{token}")
    public ResponseEntity<byte[]> getPublicDocumentContent(@PathVariable String token) {
        return documentService.findFileDataByShareToken(token)
            .map(doc -> ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" + URLEncoder.encode(doc.getFilename(), StandardCharsets.UTF_8) + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(doc.getData()))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
