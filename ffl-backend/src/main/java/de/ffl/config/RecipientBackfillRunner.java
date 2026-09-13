package de.ffl.config;

import de.ffl.service.ManagerGroupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(3)
public class RecipientBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(RecipientBackfillRunner.class);

    private final ManagerGroupService managerGroupService;

    public RecipientBackfillRunner(ManagerGroupService managerGroupService) {
        this.managerGroupService = managerGroupService;
    }

    @Override
    public void run(String... args) {
        try {
            managerGroupService.backfillRecipients();
        } catch (Exception e) {
            log.warn("Recipient backfill skipped: {}", e.getMessage());
        }
    }
}
