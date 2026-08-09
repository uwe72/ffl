package de.ffl.controller;

import de.ffl.config.EnvironmentProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class SystemInfoController {

    private final EnvironmentProvider environmentProvider;

    public SystemInfoController(EnvironmentProvider environmentProvider) {
        this.environmentProvider = environmentProvider;
    }

    @GetMapping("/system-info")
    public Map<String, String> getSystemInfo() {
        return Map.of("environment", environmentProvider.getEnvironment());
    }
}
