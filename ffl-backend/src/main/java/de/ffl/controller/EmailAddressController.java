package de.ffl.controller;

import de.ffl.dto.EmailAddressDto;
import de.ffl.service.EmailAddressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emails")
@PreAuthorize("hasRole('ADMIN')")
public class EmailAddressController {

    private final EmailAddressService emailAddressService;

    public EmailAddressController(EmailAddressService emailAddressService) {
        this.emailAddressService = emailAddressService;
    }

    @GetMapping
    public List<EmailAddressDto> getAll(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return emailAddressService.search(search);
        }
        return emailAddressService.findAll();
    }

    @PostMapping
    public ResponseEntity<EmailAddressDto> create(@RequestBody CreateRequest request) {
        try {
            EmailAddressDto created = emailAddressService.create(request.getEmail());
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/import")
    public ResponseEntity<List<EmailAddressDto>> bulkCreate(@RequestBody ImportRequest request) {
        try {
            List<EmailAddressDto> created = emailAddressService.bulkCreate(request.getEmails());
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            emailAddressService.delete(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    public static class CreateRequest {
        private String email;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class ImportRequest {
        private List<String> emails;

        public List<String> getEmails() { return emails; }
        public void setEmails(List<String> emails) { this.emails = emails; }
    }
}