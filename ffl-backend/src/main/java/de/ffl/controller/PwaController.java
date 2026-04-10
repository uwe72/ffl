package de.ffl.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
public class PwaController {

    @GetMapping("/manifest.webmanifest")
    public ResponseEntity<Resource> getManifest() {
        Resource resource = new ClassPathResource("static/manifest.webmanifest");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .contentType(MediaType.valueOf("application/manifest+json"))
                .body(resource);
    }

    @GetMapping("/sw.js")
    public ResponseEntity<Resource> getServiceWorker() {
        Resource resource = new ClassPathResource("static/sw.js");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .contentType(MediaType.valueOf("application/javascript"))
                .body(resource);
    }
}
