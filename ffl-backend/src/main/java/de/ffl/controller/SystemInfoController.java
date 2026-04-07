package de.ffl.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class SystemInfoController {

    @Value("${spring.profiles.active:}")
    private String activeProfile;

    @GetMapping("/system-info")
    public Map<String, String> getSystemInfo() {
        String environment = "docker".equals(activeProfile) ? "PROD" : "TEST";
        return Map.of("environment", environment);
    }
}
