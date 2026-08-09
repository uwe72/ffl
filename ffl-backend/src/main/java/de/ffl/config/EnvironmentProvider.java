package de.ffl.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EnvironmentProvider {

    static final String PROD_PROFILE = "docker";
    static final String PROD = "PROD";
    static final String TEST = "TEST";

    private final String activeProfile;

    public EnvironmentProvider(@Value("${spring.profiles.active:}") String activeProfile) {
        this.activeProfile = activeProfile;
    }

    public String getEnvironment() {
        return PROD_PROFILE.equals(activeProfile) ? PROD : TEST;
    }
}
