package de.ffl.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SurveyExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(SurveyExpiryScheduler.class);

    private final SurveyService surveyService;

    public SurveyExpiryScheduler(SurveyService surveyService) {
        this.surveyService = surveyService;
    }

    @Scheduled(fixedRate = 60000)
    public void endExpiredSurveys() {
        try {
            int count = surveyService.endExpiredSurveys();
            if (count > 0) {
                log.info("[Survey] {} abgelaufene Umfrage(n) automatisch beendet", count);
            }
        } catch (Exception e) {
            log.warn("[Survey] Automatisches Beenden abgelaufener Umfragen fehlgeschlagen: {}", e.getMessage());
        }
    }
}
